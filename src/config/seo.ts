import type { Metadata } from "next";

export const siteConfig = {
  name: "CampusOS",
  description: "One place for all of City University. Events, Notices, Bus Schedules, Lost & Found, and more.",
  url: "https://campusos.cityuniversity.edu.bd",
  ogImage: "https://campusos.cityuniversity.edu.bd/og.jpg",
  keywords: [
    "City University",
    "City University Bangladesh",
    "CampusOS",
    "City University Campus",
    "CU Notices",
    "CU Bus Schedule",
    "CU Events",
    "CU Chatbot",
  ],
};

export const defaultMetadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [
    {
      name: "CampusOS Team",
      url: siteConfig.url,
    },
  ],
  creator: "CampusOS Team",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: "@campusos",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};
