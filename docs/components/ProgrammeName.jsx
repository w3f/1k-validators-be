import React from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

export const ProgrammeName = () => {
  const context = useDocusaurusContext();
  const { customFields } = context.siteConfig.themeConfig;

  return <span>{customFields.programmeName}</span>;
};
