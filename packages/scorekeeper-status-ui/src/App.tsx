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

interface Job {
  name: string;
  runCount: number;
  updated: number;
  status: "running" | "finished" | "errored";
  progress?: number;
  error?: string;
  iteration?: string; // Add the progressItem property
}

const endpoints = {
  Polkadot: "https://polkadot.w3f.community/scorekeeper/jobs",
  Kusama: "https://kusama.w3f.community/scorekeeper/jobs",
  "Polkadot Staging": "https://polkadot-staging.w3f.community/scorekeeper/jobs",
  "Kusama Staging": "https://kusama-staging.w3f.community/scorekeeper/jobs",
  Local: "http://localhost:3300/scorekeeper/jobs",
};

const OLD_JOB_THRESHOLD_SECONDS = 120;
const App = () => {
  const [currentEndpoint, setCurrentEndpoint] = useState(endpoints.Local);
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(500); // Default refresh interval

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(currentEndpoint);
      if (response.data && Object.keys(response.data).length > 0) {
        // Check if the response is not empty
        setJobs(
          Object.entries(response.data).map(([name, details]) => ({
            name,
            ...details,
          })),
        );
        setHasError(false);
        setRefreshInterval(100); // Reset to faster refresh rate on success
      } else {
        setHasError(true);
        setRefreshInterval(5000); // Slow down the refresh rate on empty response
      }
    } catch (error) {
      console.error("Error fetching job data:", error);
      setHasError(true);
      setRefreshInterval(5000); // Slow down the refresh rate on error
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

    switch (status) {
      case "running":
        return (
          <div className="loader">
            <BeatLoader color={iconColor} size={8} />
          </div>
        );
      case "started":
        return (
          <div className="loader">
            <FiPlay color={iconColor} size={iconSize} />
          </div>
        );
      case "finished":
        return <FiCheckCircle color="#0f0" size={iconSize} />;
      case "errored":
        return <FiXCircle color="#f00" size={iconSize} />;
      default:
        return (
          <div className="loader">
            <BeatLoader color={iconColor} size={8} />
          </div>
        );
    }
  };

  return (
    <div className="App">
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
        {jobs.map((job: any) => {
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
              {job.error && <p className="errorMessage">Error: {job.error}</p>}
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
