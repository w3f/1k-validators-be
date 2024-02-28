import { useEffect, useState } from "react";
import axios from "axios";
import { FiAlertCircle, FiCheckCircle, FiInfo, FiWifi } from "react-icons/fi";

const HealthCheckBar = ({ currentEndpoint }) => {
  const [healthData, setHealthData] = useState({
    version: "",
    connected: false,
    currentEndpoint: "",
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
        <span>Endpoint: {healthData.currentEndpoint}</span>
      </div>
      {healthData.connected && healthData.version && (
        <div className="healthCheckItem">
          <FiInfo className="healthCheckIcon" />
          <span>Version: v{healthData.version}</span>
        </div>
      )}
    </div>
  );
};

export default HealthCheckBar;
