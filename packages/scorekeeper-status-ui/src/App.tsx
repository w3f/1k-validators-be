import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  FiActivity,
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiPlay,
  FiRefreshCcw,
  FiSend,
  FiShield,
  FiSquare,
  FiTool,
  FiUserCheck,
  FiXCircle,
} from "react-icons/fi";
import { BeatLoader } from "react-spinners";
import { motion } from "framer-motion";
import "./App.css";
import HealthCheckBar from "./HealthCheckBar";
import { Identicon } from "@polkadot/react-identicon";
import EraStatsBar from "./EraStatsBar";
import { debounce } from "lodash";

interface Job {
  name: string;
  runCount: number;
  updated: number;
  status: "running" | "finished" | "errored" | "started" | "Not Running";
  progress?: number;
  error?: string;
  iteration?: string;
  frequency: string; // Added frequency field
  isOld?: boolean; // Added isOld field
}

const endpoints = {
  Polkadot: "https://polkadot.w3f.community",
  Kusama: "https://kusama.w3f.community",
  PolkadotStaging: "https://polkadot-staging.w3f.community",
  KusamaStaging: "https://kusama-staging.w3f.community",
  Local: "http://localhost:3300",
};

const OLD_JOB_THRESHOLD_SECONDS = 120;
const App = () => {
  const [currentEndpoint, setCurrentEndpoint] = useState(endpoints.Polkadot);
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(500); // Default refresh interval
  const [nominators, setNominators] = useState([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${currentEndpoint}/scorekeeper/jobs`);
      if (response.data && Object.keys(response.data).length > 0) {
        setJobs(
          Object.entries(response.data).map(([name, details]) => ({
            name,
            ...details,
            isOld: isJobOld({ ...details, name }),
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

  const fetchNominatorsData = useCallback(async () => {
    setIsLoading(true); // Reuse the existing loading state
    try {
      const response = await axios.get(`${currentEndpoint}/nominators/status`);
      if (response.data) {
        console.log(response.data);
        setNominators(response.data); // Assuming the response is an array of nominators
        setHasError(false);
      } else {
        console.log("Received empty response for nominators");
        setHasError(true);
      }
    } catch (error) {
      console.error("Error fetching nominators data:", error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [currentEndpoint]);

  useEffect(() => {
    const interval = setInterval(fetchData, 500);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchNominatorsData, 500);
    return () => clearInterval(interval);
  }, [fetchNominatorsData]);

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

  const parseCronToMilliseconds = (cron) => {
    // Simple parsing for common cron patterns
    if (cron.startsWith("*/")) {
      // Every X minutes
      const minutes = parseInt(cron.split("/")[1], 10);
      return minutes * 60 * 1000; // Convert minutes to milliseconds
    } else if (cron.match(/^\d+ \* \* \* \*$/)) {
      // At minute X of every hour
      return 60 * 60 * 1000; // One hour in milliseconds
    }
    // Return null for unhandled or complex expressions
    return null;
  };

  // Determines if a job is "old" based on its last updated time and cron frequency
  const isJobOld = (job) => {
    const frequencyMs = parseCronToMilliseconds(job.frequency);
    if (!frequencyMs) return false; // If cron parsing is not supported, consider job not old

    const lastUpdatedMs = new Date(job.updated).getTime(); // Assuming 'updated' is in epoch ms
    const currentTimeMs = Date.now();
    const nextExpectedRunMs = lastUpdatedMs + frequencyMs;

    return currentTimeMs > nextExpectedRunMs;
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

  function truncateAddress(address, length = 16) {
    return `${address?.slice(0, length / 2)}...${address?.slice(-length / 2)}`;
  }

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

  function formatDuration(ms: number): string {
    const seconds = ms / 1000;
    const minutes = seconds / 60;
    const hours = minutes / 60;
    const days = hours / 24;

    if (days >= 1) {
      return `${Math.floor(days)} days from now`;
    } else if (hours >= 1) {
      return `${Math.floor(hours)} hours from now`;
    } else if (minutes >= 1) {
      return `${Math.floor(minutes)} mins from now`;
    } else {
      return `${Math.floor(seconds)} secs from now`;
    }
  }

  const getStateColor = (state) => {
    switch (state) {
      case "Nominated":
        return "green";
      case "Ready to Nominate":
        return "blue";
      case "Nominating":
        return "orange";
      case "Awaiting Proxy Execution":
        return "purple";
      case "Not Nominating":
        return "red";
      case "Stale":
        return "grey";
      default:
        return "black";
    }
  };

  const renderNominatorStateIcon = (state: string) => {
    let iconComponent;
    const iconSize = 24;

    switch (state) {
      case "Nominated":
        iconComponent = <FiCheckCircle color="#00FF00" size={iconSize} />;
        break;
      case "Nominating":
        iconComponent = <BeatLoader color="orange" size={8} />;
        break;
      case "Stale":
        iconComponent = <FiAlertTriangle color="#FFA500" size={iconSize} />;
        break;
      case "Not Nominating":
        iconComponent = <FiXCircle color="#FF0000" size={iconSize} />;
        break;
      case "Ready to Nominate":
      case "Awaiting Proxy Execution":
        iconComponent = <FiClock color="#FFA500" size={iconSize} />;
        break;
      default:
        iconComponent = <></>;
        break;
    }

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "5px",
        }}
      >
        {iconComponent}
        <span>{state}</span>
      </div>
    );
  };

  return (
    <div className="App">
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

      <HealthCheckBar currentEndpoint={currentEndpoint} />
      <EraStatsBar currentEndpoint={currentEndpoint} />

      <div className="jobsContainer">
        {jobs.map((job: Job) => {
          const jobAgeInSeconds = (Date.now() - job.updated) / 1000; // Convert milliseconds to seconds
          // const isOld = jobAgeInSeconds > OLD_JOB_THRESHOLD_SECONDS;
          const isError = job.status === "errored";

          return (
            <motion.div
              key={job.name}
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className={`jobItem ${job.status === "errored" ? "jobItemError" : job.status === "running" && job.isOld ? "jobItemOld" : ""}`}
            >
              <div className="jobHeader">
                {job.status === "errored" && (
                  <FiAlertTriangle color="red" size={20} />
                )}
                {job.status === "running" && job.isOld && (
                  <FiAlertTriangle color="yellow" size={20} />
                )}
                <div className="jobName">
                  <div className="jobName">
                    <h4>
                      <FiTool className="icon" />
                      {job.name}
                    </h4>
                  </div>
                </div>
                {renderStatusIcon(
                  job.status,
                  job.progress !== undefined
                    ? job.progress?.toFixed(1)
                    : undefined,
                )}
              </div>
              <p>
                <FiPlay className="icon" />
                Run Count: {job.runCount}
              </p>
              <p>
                <FiClock className="icon" />
                {parseCronExpression(job.frequency)}
              </p>

              <div className="progressBarContainer">
                <div className="progressBarBackground">
                  <div
                    className="progressBar"
                    style={{
                      width: `${job.progress !== undefined ? job.progress?.toFixed(1) : 0}%`,
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
                    {job.progress !== undefined ? job.progress?.toFixed(1) : 0}%
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
                    <FiRefreshCcw />
                  </div>
                  <p className="lastUpdatedText">
                    {formatLastUpdate(job.updated)}
                    {job.isOld}
                  </p>
                </div>
              )}
              {job.isOld && (
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
        })}
      </div>

      <h2>Nominators</h2>
      <div className="nominatorsContainer">
        {nominators.map((nominator, index) => (
          <div key={index} className="nominatorItem">
            {nominator.stashAddress && (
              <a
                href={`https://www.subscan.io/account/${nominator.stashAddress}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="nominatorField">
                  <h3>
                    {" "}
                    <FiUserCheck className="icon" />
                    Stash
                  </h3>
                  <p>
                    <Identicon
                      className="identicon"
                      value={nominator.stashAddress}
                      size={20}
                      theme="polkadot"
                    />
                    {truncateAddress(nominator.stashAddress)}
                  </p>
                </div>
              </a>
            )}

            {nominator.status && (
              <div className="nominatorStateContainer">
                <div className="parentContainer">
                  <p>
                    <div>{renderNominatorStateIcon(nominator.state)}</div>
                    {nominator.state && <hr />}
                    {nominator.status}
                  </p>
                </div>
              </div>
            )}
            {nominator.isBonded !== undefined && (
              <div>
                <p>
                  <FiCheckCircle
                    className="icon"
                    style={{ color: nominator.isBonded ? "green" : "red" }}
                  />
                  {nominator.isBonded ? "Bonded" : "Not Bonded"}
                </p>
              </div>
            )}
            {nominator.bondedAmount > 0 && (
              <p>
                <FiDollarSign className="icon" /> Bonded Amount:{" "}
                {new Intl.NumberFormat().format(
                  nominator.bondedAmount?.toFixed(2),
                )}{" "}
                {currentEndpoint.includes("kusama") ? "KSM" : "DOT"}
              </p>
            )}

            {nominator.isProxy && (
              <p>
                <FiShield className="icon" style={{ color: "blue" }} />
                {nominator.proxyDelay && nominator.proxyDelay > 0
                  ? "Time Delay Proxy"
                  : "Proxy"}
              </p>
            )}
            {nominator.proxyAddress && (
              <a
                href={`https://www.subscan.io/account/${nominator.proxyAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
              >
                <div class="nominatorField">
                  <p>
                    <FiUserCheck className="icon" /> Proxy Address:
                  </p>
                  <p>
                    <Identicon
                      value={nominator.proxyAddress}
                      size={20}
                      theme="polkadot"
                      className="identicon"
                    />
                    {truncateAddress(nominator.proxyAddress)}
                  </p>
                </div>
              </a>
            )}
            {nominator.lastNominationEra > 0 && (
              <p>
                <FiCalendar className="icon" />
                {"Last Nomination Era: "}
                <span style={{ color: nominator.stale ? "red" : "inherit" }}>
                  {nominator.lastNominationEra}
                </span>
                {nominator.stale && (
                  <FiAlertTriangle
                    className="icon"
                    style={{ marginLeft: "5px", color: "red" }}
                  />
                )}
              </p>
            )}
            {nominator.currentTargets.map((target, index) => (
              <li key={index} className="targetItemWrapper">
                <div className="">
                  <a
                    href={`https://www.subscan.io/account/${target.stash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                    className="targetField"
                  >
                    <Identicon
                      value={target.stash}
                      size={20}
                      theme="polkadot"
                    />
                    {target.name
                      ? `[${target.score?.toFixed(0)}] ${target.name}`
                      : `[${target.score?.toFixed(0)}] ${truncateAddress(target.stash)}`}{" "}
                    {target.kyc && (
                      <FiCheckCircle
                        style={{ color: "green", marginLeft: "5px" }}
                        title="KYC Verified"
                      />
                    )}
                  </a>
                </div>
              </li>
            ))}

            {nominator.stale !== undefined && nominator.stale != false && (
              <div className="stale">
                <h3>
                  <FiAlertTriangle
                    className="icon"
                    style={{ color: nominator.stale ? "orange" : "grey" }}
                  />
                  Stale
                </h3>
              </div>
            )}
            {nominator.updated && (
              <p>
                <FiRefreshCcw className="icon" />
                {formatLastUpdate(nominator.updated)}
              </p>
            )}
            {nominator.proxyTxs && nominator.proxyTxs.length > 0 && (
              <div className="proxyTransactions">
                <div className="proxyHeader">
                  <h3>
                    <FiSend className="icon" />
                    Proxy Txs{" "}
                    <span
                      style={{
                        border:
                          nominator.proxyTxs.length === 1
                            ? "1px solid #00d600"
                            : "1px solid red",
                        borderRadius: "5px",
                        padding: "7px",
                        color:
                          nominator.proxyTxs.length === 1 ? "#00ff00" : "red",
                      }}
                    >
                      {nominator.proxyTxs.length}
                      {nominator.proxyTxs.length > 1 && (
                        <FiAlertTriangle
                          className="icon"
                          style={{ marginLeft: "5%" }}
                        />
                      )}
                    </span>
                  </h3>
                </div>
                {nominator.proxyTxs.map((transaction, index) => (
                  <div key={index} className="proxyTransactionItem">
                    <a
                      href={`https://www.subscan.io/account/${nominator.stashAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="nominatorField">
                        <p>
                          <FiUserCheck className="icon" />
                          {truncateAddress(transaction.controller)}
                        </p>
                      </div>
                    </a>
                    <p>
                      <FiSquare className="icon" />
                      Block #{transaction.number}
                    </p>
                    <p>
                      <FiCalendar className="icon" />
                      {formatDuration(transaction.executionTime)}
                    </p>
                    <p>
                      <FiActivity className="icon" />
                      {truncateAddress(transaction.callHash)}
                    </p>
                    {transaction.timestamp && (
                      <p>
                        <FiClock className="icon" />
                        Timestamp:{" "}
                        {new Date(transaction.timestamp).toLocaleString()}
                      </p>
                    )}
                    {transaction.targets.map((target, index) => (
                      <li key={index} className="targetItemWrapper">
                        <div>
                          <a
                            href={`https://www.subscan.io/account/${target.stash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                              justifyContent: "flex-start",
                            }}
                            className="targetField"
                          >
                            <Identicon
                              value={target.stash}
                              size={20}
                              theme="polkadot"
                            />
                            {target.name
                              ? `${target.name}`
                              : `${truncateAddress(target.stash)}`}{" "}
                            {target.kyc && (
                              <FiCheckCircle
                                style={{ color: "green", marginLeft: "5px" }}
                                title="KYC Verified"
                              />
                            )}
                          </a>
                        </div>
                      </li>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
