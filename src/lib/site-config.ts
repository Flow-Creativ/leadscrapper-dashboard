export const siteConfig = {
  name: "Lead Scraper",
  description:
    "Scrape Google Maps for business leads with real-time enrichment and AI-powered outreach",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://leadgen.benelabs.tech",
  ogImage: "/og-image.svg",
  twitterImage: "/twitter-image.svg",
  keywords: [
    "Google Maps scraper",
    "lead generation",
    "business leads",
    "sales prospecting",
    "B2B leads",
    "contact finder",
  ],
  authors: [{ name: "Lead Scraper" }],
  creator: "Lead Scraper",
} as const;
