"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

interface AccountRestrictedBannerProps {
  onDismiss?: () => void;
}

export function AccountRestrictedBanner({ onDismiss }: AccountRestrictedBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div className="bg-red-50 dark:bg-red-950 border-b border-red-200 dark:border-red-800">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-medium text-red-800 dark:text-red-200">
                Account Temporarily Restricted
              </span>
              <span className="text-red-700 dark:text-red-300 ml-1">
                — Your account has been restricted due to excessive requests.
                This restriction will be lifted automatically. Please try again later.
              </span>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-red-600 dark:text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
