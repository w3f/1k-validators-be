const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

// With JSDoc @type annotations, IDEs can provide config autocompletion
/** @type {import('@docusaurus/types').DocusaurusConfig} */
(
  module.exports = {
    title: "Thousand Validators Programme",
    tagline: "Supporting Decentralization",
    titleDelimiter: "·",
    url: "https://your-docusaurus-test-site.com",
    baseUrl: "/docs/",
    onBrokenLinks: "warn",
    onBrokenMarkdownLinks: "warn",
    favicon: "img/favicon.ico",
    organizationName: "facebook", // Usually your GitHub org/user name.
    projectName: "docusaurus", // Usually your repo name.

    presets: [
      [
        "@docusaurus/preset-classic",
        /** @type {import('@docusaurus/preset-classic').Options} */
        ({
          docs: {
            sidebarPath: require.resolve("./sidebars.js"),
            // Please change this to your repo.
            editUrl:
              "https://github.com/facebook/docusaurus/edit/main/website/",
          },
          blog: {
            showReadingTime: true,
            // Please change this to your repo.
            editUrl:
              "https://github.com/facebook/docusaurus/edit/main/website/blog/",
          },
          theme: {
            customCss: [
              require.resolve("./static/css/custom.css"),
              require.resolve("./static/css/copycode.css"),
              require.resolve("./static/css/socicon.css"),
            ],
          },
        }),
      ],
    ],

    themeConfig: {
      customFields: {
        programmeName: "Thousand Validators Programme",
      },
      colorMode: {
        disableSwitch: true,
      },
      prism: {
        additionalLanguages: ["rust"],
        theme: require("prism-react-renderer/themes/github"),
      },
      /*
      announcementBar: {
        id: 'announcement',
        content: '<a target="_blank" href="https://decoded.polkadot.network/">POLKADOT DECODED June 29th-30th, 2022. Join 100+ talks, live streamed from 4 locations worldwide</a>',
        backgroundColor: '#E6007A',
        textColor: '#FFFFFF',
        isCloseable: false,
      },
      */
      liveCodeBlock: {
        /**
         * The position of the live playground, above or under the editor
         * Possible values: "top" | "bottom"
         */
        playgroundPosition: "bottom",
      },
      navbar: {
        logo: {
          src: "img/Polkadot_Logo_Horizontal_Pink-Black.svg",
        },
        items: [
          {
            to: "docs/getting-started",
            label: "Getting Started",
            position: "right",
          },
          {
            to: "docs/requirements",
            label: "Requirements",
            position: "right",
          },
          {
            to: "docs/backend",
            label: "Backend",
            position: "right",
          },
          {
            href: "docs/terms-of-service",
            label: "Terms of Service",
            position: "right",
          },
          {
            type: "search",
            position: "right",
          },
          {
            to: "https://docs.google.com/forms/d/e/1FAIpQLSdS-alI-J2wgIRCQVjQC7ZbFiTnf36hYBdmO-1ARMjKbC7H9w/viewform?ref=polkadot-network",
            label: "Apply",
            position: "right",
          },
        ],
      },
      footer: {
        copyright: `© ${new Date().getFullYear()} Web3 Foundation`,
        logo: {
          src: "img/Polkadot_Logo_Horizontal_White.svg",
        },
      },
      docsSideNavCollapsible: true,
      /* Banner / Announcement bar */
      announcementBar: {
        id: "banner",
        content:
          'The Decentralized Futures Program is now live! <a href="https://www.polkadot.network/development/academy/?utm_source=wiki.polkadot.network&utm_medium=referral&utm_campaign=pba%204%205&utm_content=notification" target="_blank" rel="noopener noreferrer">Find out more 👉</a>',
        backgroundColor: "#e6007a",
        textColor: "white",
        isCloseable: true,
      },
      image: "img/og-polkadot.png",
    },
  }
);
