import React, { useCallback, useEffect, useState } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiPlay,
  FiXCircle,
} from "react-icons/fi";
import { BeatLoader } from "react-spinners";
import { motion } from "framer-motion";
import "./App.css";
import axios from "axios"; // Ensure the path to your CSS file is correct
import { debounce } from "lodash";
import HealthCheckBar from "./HealthCheckBar";

interface Job {
  name: string;
  runCount: number;
  updated: number;
  status: "running" | "finished" | "errored" | "started" | "Not Running";
  progress?: number;
  error?: string;
  iteration?: string;
  frequency: string; // Added frequency field
}

const endpoints = {
  Polkadot: "https://polkadot.w3f.community/scorekeeper/jobs",
  Kusama: "https://kusama.w3f.community/scorekeeper/jobs",
  PolkadotStaging: "https://polkadot-staging.w3f.community/scorekeeper/jobs",
  KusamaStaging: "https://kusama-staging.w3f.community/scorekeeper/jobs",
  Local: "http://localhost:3300/scorekeeper/jobs",
};

const OLD_JOB_THRESHOLD_SECONDS = 120;
const App = () => {
  const [currentEndpoint, setCurrentEndpoint] = useState(
    endpoints.KusamaStaging,
  );
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(500); // Default refresh interval

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(currentEndpoint);
      if (response.data && Object.keys(response.data).length > 0) {
        setJobs(
          Object.entries(response.data).map(([name, details]) => ({
            name,
            ...details,
          })),
        );
        setHasError(false);
        setRefreshInterval(800); // Reset to faster refresh rate on success
      } else {
        // Handle empty response
        console.log("Received empty response");
        setHasError(true);
        setRefreshInterval(5000); // Slow down the refresh rate
      }
    } catch (error) {
      console.error("Error fetching job data:", error);
      setHasError(true);
      setRefreshInterval(5000); // Slow down the refresh rate on error

      // Provide more specific error handling
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(error.response.data);
        console.log(error.response.status);
        console.log(error.response.headers);
        if (error.response.status === 404) {
          // Handle 404 Not Found
          console.error("The requested endpoint was not found.");
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response was received from the server.");
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Error", error.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentEndpoint]);

  useEffect(() => {
    const interval = setInterval(fetchData, 500);
    return () => clearInterval(interval);
  }, [fetchData]);

  const debouncedFetchData = useCallback(debounce(fetchData, 2000), [
    fetchData,
  ]);

  useEffect(() => {
    debouncedFetchData();
  }, [currentEndpoint, debouncedFetchData]);

  useEffect(() => {
    if (hasError) {
      debouncedFetchData();
    }
  }, [hasError, debouncedFetchData]);

  const renderStatusIcon = (status: string, progress?: number) => {
    const iconSize = 24; // Size of the icons
    let iconColor = "";

    // Determine icon color based on progress
    if (progress == undefined || progress === 0) {
      iconColor = "#FF0000"; // Red
    } else if (progress === 100) {
      iconColor = "#00FF00"; // Green
    } else {
      iconColor = "#FFFF00"; // Yellow
    }

    let statusText = ""; // Initialize status text
    let iconComponent; // Initialize icon component

    switch (status) {
      case "running":
        iconComponent = <BeatLoader color={iconColor} size={8} />;
        statusText = "Running";
        break;
      case "started":
        iconComponent = <FiPlay color={iconColor} size={iconSize} />;
        statusText = "Started";
        break;
      case "finished":
        iconComponent = <FiCheckCircle color="#0f0" size={iconSize} />;
        statusText = "Finished";
        break;
      case "errored":
        iconComponent = <FiXCircle color="#f00" size={iconSize} />;
        statusText = "Errored";
        break;
      default:
        iconComponent = <BeatLoader color={iconColor} size={8} />;
        statusText = "Unknown";
        break;
    }
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        {iconComponent}
        <span>{statusText}</span>
      </div>
    );
  };

  const getCronFrequencyInSeconds = (cron: string): number => {
    // Simple parsing for common cron patterns, returning frequency in seconds
    if (cron.startsWith("*/")) {
      const seconds = parseInt(cron.split("/")[1], 10);
      return isNaN(seconds) ? 0 : seconds; // Every X seconds
    } else if (cron.startsWith("0 */")) {
      const minutes = parseInt(cron.split(" ")[1].split("/")[1], 10);
      return isNaN(minutes) ? 0 : minutes * 60; // Every X minutes
    }
    // Add more parsing logic as needed for hours, days, etc.

    return 0; // Default to 0 for unhandled expressions or complex schedules
  };

  // Determines if a job is "old" based on its last updated time and cron frequency
  const isJobOld = (job: Job): boolean => {
    const currentTime = Date.now(); // Current time in milliseconds
    const lastUpdated = job.updated; // Assuming 'updated' is in milliseconds
    const cronFrequencySeconds = getCronFrequencyInSeconds(job.frequency);
    const oldJobThreshold = cronFrequencySeconds * 1000; // Convert seconds to milliseconds

    // Calculate the time difference between now and the last update
    const timeSinceLastUpdate = currentTime - lastUpdated;

    // Determine if the job is old based on the cron frequency
    return timeSinceLastUpdate > oldJobThreshold;
  };

  const parseCronExpression = (cron: string) => {
    const parts = cron.split(" ");
    // Assuming the cron format is standard and the minute field is the second part (0-59/interval)
    if (parts.length >= 2) {
      const minutePart = parts[1];
      if (minutePart.includes("/")) {
        const interval = minutePart.split("/")[1];
        return `Running every ${interval}m`;
      }
    }
    // Fallback if the cron expression doesn't match expected patterns
    return "at a specific time";
  };

  return (
    <div className="App">
      <HealthCheckBar currentEndpoint={currentEndpoint} />
      <h1>Scorekeeper Status</h1>
      <select
        value={currentEndpoint}
        onChange={(e) => setCurrentEndpoint(e.target.value)}
        className="endpointSelector"
      >
        {Object.entries(endpoints).map(([name, url]) => (
          <option key={name} value={url}>
            {name}
          </option>
        ))}
      </select>

      <div className="jobsContainer">
        {jobs.map((job: Job) => {
          const jobAgeInSeconds = (Date.now() - job.updated) / 1000; // Convert milliseconds to seconds
          const isOld = jobAgeInSeconds > OLD_JOB_THRESHOLD_SECONDS;
          const isError = job.status === "errored";

          return (
            <motion.div
              key={job.name}
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className={`jobItem ${job.status === "errored" ? "jobItemError" : job.status === "running" && (Date.now() - job.updated) / 1000 > OLD_JOB_THRESHOLD_SECONDS ? "jobItemOld" : ""}`}
            >
              <div className="jobHeader">
                {job.status === "errored" && (
                  <FiAlertTriangle color="red" size={20} />
                )}
                {job.status === "running" &&
                  (Date.now() - job.updated) / 1000 >
                    OLD_JOB_THRESHOLD_SECONDS && (
                    <FiAlertTriangle color="yellow" size={20} />
                  )}
                <h2>{job.name}</h2>
                {renderStatusIcon(
                  job.status,
                  job.progress !== undefined
                    ? job.progress.toFixed(1)
                    : undefined,
                )}
              </div>
              <p>Run Count: {job.runCount}</p>
              <p>{parseCronExpression(job.frequency)}</p>

              <div className="progressBarContainer">
                <div className="progressBarBackground">
                  <div
                    className="progressBar"
                    style={{
                      width: `${job.progress !== undefined ? job.progress.toFixed(1) : 0}%`,
                    }}
                  ></div>
                </div>
                <p className="progressText">
                  Progress:{" "}
                  <span
                    className="progressPercentage"
                    style={{
                      paddingLeft: "2px",
                      paddingRight: "2px",
                      border: `1px solid linear-gradient(to right, rgba(255, 0, 0, 0.1) ${job.progress}%, rgba(255, 255, 0, 0.1) ${job.progress}%, rgba(0, 255, 0, 0.1) ${job.progress}%)`,
                    }}
                  >
                    {job.progress !== undefined ? job.progress.toFixed(1) : 0}%
                  </span>
                </p>
                {job.iteration && (
                  <p className="progressItem">{job.iteration}</p> // Apply class to the progress iteration text
                )}
              </div>
              {(Date.now() - job.updated) / 1000 >
              OLD_JOB_THRESHOLD_SECONDS ? null : (
                <div className="lastUpdatedBox">
                  <div
                    className={`timeIcon ${(Date.now() - job.updated) / 1000 > OLD_JOB_THRESHOLD_SECONDS ? "oldTime" : ""}`}
                  >
                    <FiClock />
                  </div>
                  <p className="lastUpdatedText">
                    Last Updated: {formatLastUpdate(job.updated)}
                  </p>
                </div>
              )}
              {(Date.now() - job.updated) / 1000 >
                OLD_JOB_THRESHOLD_SECONDS && (
                <div className="lastUpdateBox">
                  <div className="warningSymbol">
                    <FiAlertTriangle color="yellow" size={20} />
                  </div>
                  <p>Last Update: {formatLastUpdate(job.updated)}</p>
                </div>
              )}
              {job.error && (
                <div className={`errorContainer ${hasError ? "visible" : ""}`}>
                  <div className="errorContainer">
                    <p className="errorMessage">
                      <FiAlertTriangle color="yellow" size={20} />
                      {job.error}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          );

          function formatLastUpdate(updated: number): string {
            const secondsSinceUpdate = (Date.now() - updated) / 1000;
            if (secondsSinceUpdate < 60) {
              return `${Math.floor(secondsSinceUpdate)} second${Math.floor(secondsSinceUpdate) !== 1 ? "s" : ""} ago`;
            } else if (secondsSinceUpdate < 3600) {
              return `${Math.floor(secondsSinceUpdate / 60)} minute${Math.floor(secondsSinceUpdate / 60) !== 1 ? "s" : ""} ago`;
            } else {
              return `${Math.floor(secondsSinceUpdate / 3600)} hour${Math.floor(secondsSinceUpdate / 3600) !== 1 ? "s" : ""} ago`;
            }
          }
        })}
      </div>
    </div>
  );
};

export default App;
