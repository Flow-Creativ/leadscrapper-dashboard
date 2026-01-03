import {
  logEvent as firebaseLogEvent,
  setUserId as firebaseSetUserId,
  setUserProperties as firebaseSetUserProperties,
} from "firebase/analytics";
import { getFirebaseAnalytics } from "./config";

export async function initAnalytics() {
  return await getFirebaseAnalytics();
}

async function logEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  try {
    const analytics = await getFirebaseAnalytics();
    if (analytics) {
      firebaseLogEvent(analytics, eventName, params);
    }
  } catch (error) {
    // Silently fail in case analytics is blocked
    console.debug("Analytics event failed:", eventName, error);
  }
}

export async function setUserId(userId: string | null) {
  try {
    const analytics = await getFirebaseAnalytics();
    if (analytics) {
      firebaseSetUserId(analytics, userId);
    }
  } catch (error) {
    console.debug("Set user ID failed:", error);
  }
}

export async function setUserProperties(properties: Record<string, string>) {
  try {
    const analytics = await getFirebaseAnalytics();
    if (analytics) {
      firebaseSetUserProperties(analytics, properties);
    }
  } catch (error) {
    console.debug("Set user properties failed:", error);
  }
}

// App version for user properties
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";

// Initialize analytics with app version and platform
export async function initAnalyticsWithVersion() {
  try {
    const analytics = await getFirebaseAnalytics();
    if (analytics) {
      firebaseSetUserProperties(analytics, {
        app_version: APP_VERSION,
        platform: "web",
      });
    }
    return analytics;
  } catch (error) {
    console.debug("Init analytics with version failed:", error);
    return null;
  }
}

// Page view tracking (sends both page_view and screen_view)
export const trackPageView = (path: string, title: string) => {
  // GA4 compatible page_view
  logEvent("page_view", { page_path: path, page_title: title });
  // Firebase screen_view for dashboard "Views by Page title and screen class"
  logEvent("screen_view", {
    firebase_screen: title,
    firebase_screen_class: path.split("/")[1] || "home",
  });
};

// Explicit screen view tracking
export const trackScreenView = (screenName: string, screenClass: string = "web") =>
  logEvent("screen_view", {
    firebase_screen: screenName,
    firebase_screen_class: screenClass,
  });

// Auth tracking
export const trackSignIn = (method: string = "email") =>
  logEvent("sign_in", { method });

export const trackSignUp = (method: string = "email") =>
  logEvent("sign_up", { method });

export const trackSignOut = () => logEvent("sign_out");

// Scrape job tracking
export const trackScrapeStarted = (query: string, maxResults: number) =>
  logEvent("scrape_started", { query, max_results: maxResults });

export const trackScrapeCompleted = (jobId: string, leadCount: number) =>
  logEvent("scrape_completed", { job_id: jobId, lead_count: leadCount });

export const trackScrapeFailed = (jobId: string, error: string) =>
  logEvent("scrape_failed", { job_id: jobId, error: error.slice(0, 100) });

export const trackJobCancelled = (jobId: string, query: string) =>
  logEvent("job_cancelled", { job_id: jobId, query });

export const trackJobListViewed = (jobCount: number) =>
  logEvent("job_list_viewed", { job_count: jobCount });

export const trackJobDetailViewed = (jobId: string, status: string) =>
  logEvent("job_detail_viewed", { job_id: jobId, status });

// Lead interaction tracking
export const trackLeadViewed = (leadName: string, tier: string) =>
  logEvent("lead_viewed", { lead_name: leadName, tier });

export const trackLeadExported = (format: string, count: number) =>
  logEvent("lead_exported", { format, count });

export const trackOutreachCopied = (channel: string, tier: string) =>
  logEvent("outreach_copied", { channel, tier });

// General tracking
export const trackFormSubmitted = (formName: string) =>
  logEvent("form_submitted", { form_name: formName });

export const trackButtonClick = (buttonName: string, location: string) =>
  logEvent("button_clicked", { button_name: buttonName, location });

export const trackFeatureUsed = (featureName: string) =>
  logEvent("feature_used", { feature_name: featureName });

export const trackNavigation = (destination: string, source: string) =>
  logEvent("navigation", { destination, source });

export const trackExternalLinkClick = (linkType: string, url: string) =>
  logEvent("external_link_click", { link_type: linkType, url: url.slice(0, 100) });

export const trackContactAction = (actionType: string, leadName: string) =>
  logEvent("contact_action", { action_type: actionType, lead_name: leadName });

// Error tracking for app stability
export const trackError = (error: Error, fatal: boolean = false) =>
  logEvent("app_exception", {
    description: error.message.slice(0, 100),
    fatal,
  });

// Setup global error listeners
export function setupErrorTracking() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    trackError(new Error(event.message), false);
  });

  window.addEventListener("unhandledrejection", (event) => {
    trackError(new Error(String(event.reason)), false);
  });
}

// Capture UTM parameters for channel attribution
export function captureUTMParams() {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  const utmCampaign = params.get("utm_campaign");

  if (utmSource || utmMedium || utmCampaign) {
    logEvent("campaign_details", {
      source: utmSource || "(direct)",
      medium: utmMedium || "(none)",
      campaign: utmCampaign || "(none)",
    });
  }
}
