"use client";

import { useCallback, useRef, useState } from "react";
import { startScrape, getWebSocketUrl, cancelJob } from "@/lib/api";
import { useWebSocket } from "./use-websocket";
import {
  trackScrapeCompleted,
  trackScrapeFailed,
} from "@/lib/firebase/analytics";
import type {
  ScrapeRequest,
  JobProgress,
  JobSummary,
  Lead,
  WsMessage,
  JobStatus,
} from "@/lib/types";

interface UseScrapeJobReturn {
  // State
  jobId: string | null;
  status: JobStatus | null;
  progress: JobProgress | null;
  leads: Lead[];
  summary: JobSummary | null;
  error: string | null;
  isLoading: boolean;

  // Actions
  start: (request: ScrapeRequest) => Promise<void>;
  cancel: () => Promise<void>;
  reset: () => void;
}

export function useScrapeJob(): UseScrapeJobReturn {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<JobSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Ref to track jobId in callbacks
  const jobIdRef = useRef<string | null>(null);

  const handleMessage = useCallback((message: WsMessage) => {
    switch (message.type) {
      case "status":
        setProgress({
          step: message.step,
          current: message.current,
          total: message.total,
          message: message.message,
        });
        setStatus("running");
        break;

      case "lead":
        setLeads((prev) => [...prev, message.data]);
        break;

      case "error":
        setError(message.message);
        if (!message.recoverable) {
          setStatus("failed");
          setIsLoading(false);
          // Track scrape failure
          if (jobIdRef.current) {
            trackScrapeFailed(jobIdRef.current, message.message);
          }
        }
        break;

      case "complete":
        setSummary(message.summary);
        setStatus("completed");
        setIsLoading(false);
        // Track scrape completion
        if (jobIdRef.current) {
          trackScrapeCompleted(jobIdRef.current, message.summary.total_leads);
        }
        break;

      case "ping":
        // Ignore ping messages
        break;
    }
  }, []);

  const { connect, disconnect } = useWebSocket({
    onMessage: handleMessage,
    onOpen: () => {
      setStatus("running");
    },
    onClose: () => {
      // Only mark as failed if we didn't complete successfully
      if (status === "running") {
        setError("Connection lost");
      }
    },
    onError: () => {
      setError("WebSocket connection failed");
    },
  });

  const start = useCallback(
    async (request: ScrapeRequest) => {
      setIsLoading(true);
      setError(null);
      setLeads([]);
      setSummary(null);
      setProgress(null);
      setStatus("pending");

      try {
        const response = await startScrape(request);
        setJobId(response.job_id);
        jobIdRef.current = response.job_id;

        // Connect to WebSocket for real-time updates
        const wsUrl = getWebSocketUrl(response.job_id);
        connect(wsUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start scrape");
        setStatus("failed");
        setIsLoading(false);
      }
    },
    [connect]
  );

  const cancel = useCallback(async () => {
    if (!jobId) return;

    try {
      await cancelJob(jobId);
      setStatus("cancelled");
      setIsLoading(false);
      disconnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel job");
    }
  }, [jobId, disconnect]);

  const reset = useCallback(() => {
    disconnect();
    setJobId(null);
    setStatus(null);
    setProgress(null);
    setLeads([]);
    setSummary(null);
    setError(null);
    setIsLoading(false);
  }, [disconnect]);

  return {
    jobId,
    status,
    progress,
    leads,
    summary,
    error,
    isLoading,
    start,
    cancel,
    reset,
  };
}
