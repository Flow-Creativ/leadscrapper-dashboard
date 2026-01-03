"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  initAnalyticsWithVersion,
  trackPageView,
  setUserId,
  setUserProperties,
  setupErrorTracking,
  captureUTMParams,
} from "@/lib/firebase/analytics";
import { useAuth } from "./auth-provider";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const initialized = useRef(false);

  // Initialize analytics on mount (once)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Initialize with app version and platform
    initAnalyticsWithVersion();

    // Setup global error tracking for app stability
    setupErrorTracking();

    // Capture UTM params on first load for channel attribution
    captureUTMParams();
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (pathname) {
      // Small delay to ensure document.title is updated
      const timeout = setTimeout(() => {
        trackPageView(pathname, document.title);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [pathname]);

  // Set user ID and properties when authenticated
  useEffect(() => {
    if (user) {
      setUserId(user.id);
      setUserProperties({
        auth_provider: user.app_metadata?.provider || "email",
      });
    } else {
      setUserId(null);
    }
  }, [user]);

  return <>{children}</>;
}
