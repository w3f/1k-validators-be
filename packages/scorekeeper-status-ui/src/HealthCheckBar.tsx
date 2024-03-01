import { useEffect, useState } from "react";
import axios from "axios";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiInfo,
  FiWifi,
} from "react-icons/fi"; // Added FiClock for the uptime icon

const HealthCheckBar = ({ currentEndpoint }) => {
  const [healthData, setHealthData] = useState({
    version: "",
    connected: false,
    currentEndpoint: "",
    upSince: null, // Assuming this field is part of your healthData
  });

  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        const healthCheckEndpoint = new URL("/healthcheck", currentEndpoint)
          .href;
        const { data } = await axios.get(healthCheckEndpoint);
        setHealthData(data);
      } catch (error) {
        console.error("Error fetching health check data:", error);
      }
    };

    fetchHealthData();
  }, [currentEndpoint]);

  // Utility function to calculate and format uptime
  const formatUptime = (upSince) => {
    const upSinceDate = new Date(upSince);
    const now = new Date();
    const diffInSeconds = Math.floor((now - upSinceDate) / 1000);
    const days = Math.floor(diffInSeconds / (3600 * 24));
    const hours = Math.floor((diffInSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((diffInSeconds % 3600) / 60);
    const seconds = diffInSeconds % 60;

    const formattedUptime = [];
    if (days > 0) formattedUptime.push(`${days} day${days > 1 ? "s" : ""}`);
    if (hours > 0) formattedUptime.push(`${hours} hour${hours > 1 ? "s" : ""}`);
    if (minutes > 0)
      formattedUptime.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
    if (seconds > 0)
      formattedUptime.push(`${seconds} second${seconds > 1 ? "s" : ""}`);

    return formattedUptime.join(", ") || "0 seconds";
  };

  return (
    <div className="healthCheckBar">
      <div className="healthCheckItem">
        {healthData.connected ? (
          <FiCheckCircle className="healthCheckIcon connected" />
        ) : (
          <FiAlertCircle className="healthCheckIcon disconnected" />
        )}
        <span>Connected: {healthData.connected ? "Yes" : "No"}</span>
      </div>
      <div className="healthCheckItem">
        <FiWifi className="healthCheckIcon" />
        <span>Endpoint: {currentEndpoint}</span>{" "}
        {/* Changed to currentEndpoint for clarity */}
      </div>
      {healthData.connected && healthData.version && (
        <div className="healthCheckItem">
          <FiInfo className="healthCheckIcon" />
          <span>Version: v{healthData.version}</span>
        </div>
      )}
      {healthData.upSince && (
        <div className="healthCheckItem">
          <FiClock className="healthCheckIcon" />
          <span>Up Since: {formatUptime(healthData.upSince)}</span>
        </div>
      )}
    </div>
  );
};

export default HealthCheckBar;
