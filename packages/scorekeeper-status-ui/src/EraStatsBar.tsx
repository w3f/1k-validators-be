import { useEffect, useState } from "react";
import axios from "axios";
import {
  FiActivity,
  FiCalendar,
  FiCheckSquare,
  FiServer,
  FiUserCheck,
} from "react-icons/fi";

const EraStatsBar = ({ currentEndpoint }) => {
  const [eraStats, setEraStats] = useState({
    when: null,
    era: null,
    totalNodes: null,
    valid: null,
    active: null,
    kyc: null,
  });

  useEffect(() => {
    const fetchEraStats = async () => {
      try {
        const eraStatsEndpoint = new URL("/erastats", currentEndpoint).href;
        const { data } = await axios.get(eraStatsEndpoint);
        // console.log("Era Stats Data:", JSON.stringify(data));
        setEraStats(data[0]);
        console.log(`era stats`);
        console.log(JSON.stringify(eraStats));
      } catch (error) {
        console.error("Error fetching era stats data:", error);
      }
    };

    const interval = setInterval(fetchEraStats, 500);
    return () => clearInterval(interval);
  }, [currentEndpoint]);

  return (
    <div className="eraStatsBar">
      <div className="eraStatsItem">
        <FiCalendar className="icon" />
        <span>Era: {eraStats?.era}</span>
      </div>
      <div className="eraStatsItem">
        <FiServer className="icon" />
        <span>Total Nodes: {eraStats?.totalNodes}</span>
      </div>
      <div className="eraStatsItem">
        <FiCheckSquare className="icon" />
        <span>Valid: {eraStats?.valid}</span>
      </div>
      <div className="eraStatsItem">
        <FiActivity className="icon" />
        <span>Active: {eraStats?.active}</span>
      </div>
      <div className="eraStatsItem">
        <FiUserCheck className="icon" />
        <span>
          KYC: {eraStats?.kyc} (
          {((eraStats?.kyc / eraStats?.totalNodes) * 100).toFixed(0)}%)
        </span>
      </div>
    </div>
  );
};

export default EraStatsBar;
