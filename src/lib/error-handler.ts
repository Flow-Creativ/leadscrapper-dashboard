/**
 * Error handling utilities for API errors with user-friendly messaging.
 */

import { toast } from "sonner";
import { ApiError } from "./types";

/**
 * Format seconds into a human-readable countdown string.
 */
function formatCountdown(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
}

/**
 * Show a rate limit toast with countdown.
 */
export function showRateLimitToast(retryAfter: number | null = 60): void {
  const seconds = retryAfter || 60;
  toast.warning("Slow down!", {
    description: `You're making requests too fast. Try again in ${formatCountdown(seconds)}.`,
    duration: Math.min(seconds * 1000, 10000), // Show for up to 10 seconds
  });
}

/**
 * Show an account restricted toast (banned).
 */
export function showBannedToast(): void {
  toast.error("Account Temporarily Restricted", {
    description:
      "Your account has been temporarily restricted due to excessive requests. Please try again later.",
    duration: 10000,
  });
}

/**
 * Show an unauthorized toast.
 */
export function showUnauthorizedToast(): void {
  toast.error("Session Expired", {
    description: "Please sign in again to continue.",
    duration: 5000,
  });
}

/**
 * Handle an API error and show appropriate toast.
 * Returns the error type for additional handling.
 */
export function handleApiError(error: unknown): {
  type: "rate_limit" | "banned" | "unauthorized" | "generic";
  message: string;
} {
  if (error instanceof ApiError) {
    switch (error.type) {
      case "rate_limit":
        showRateLimitToast(error.retryAfter);
        return { type: "rate_limit", message: error.message };

      case "banned":
        showBannedToast();
        return { type: "banned", message: error.message };

      case "unauthorized":
        showUnauthorizedToast();
        return { type: "unauthorized", message: error.message };

      default:
        toast.error("Something went wrong", {
          description: error.message,
        });
        return { type: "generic", message: error.message };
    }
  }

  // Generic error handling
  const message = error instanceof Error ? error.message : "An unexpected error occurred";
  toast.error("Error", { description: message });
  return { type: "generic", message };
}

/**
 * Check if an error is a rate limit error.
 */
export function isRateLimitError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.isRateLimited;
}

/**
 * Check if an error is a banned error.
 */
export function isBannedError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.isBanned;
}
