"use client";

import { useCallback, useRef, useState } from "react";
import { startScrape, getStreamUrl, cancelJob } from "@/lib/api";
import {
  trackScrapeCompleted,
  trackScrapeFailed,
} from "@/lib/firebase/analytics";
import type {
  ScrapeRequest,
  JobProgress,
  JobSummary,
  Lead,
  SSEMessage,
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
  const esRef = useRef<EventSource | null>(null);

  const handleSSEMessage = useCallback((eventType: string, data: SSEMessage) => {
    switch (eventType) {
      case "status":
        setProgress({
          step: data.step || "",
          current: data.current || 0,
          total: data.total || 0,
          message: data.message || null,
        });
        setStatus("running");
        break;

      case "lead":
        if (data.data) {
          setLeads((prev) => [...prev, data.data as Lead]);
        }
        break;

      case "lead_update":
        if (data.data) {
          const updatedLead = data.data as Lead;
          setLeads((prev) =>
            prev.map((lead) =>
              lead.place_id === updatedLead.place_id ? updatedLead : lead
            )
          );
        }
        break;

      case "error":
        setError(data.message || "An error occurred");
        if (!data.recoverable) {
          setStatus("failed");
          setIsLoading(false);
          // Track scrape failure
          if (jobIdRef.current) {
            trackScrapeFailed(jobIdRef.current, data.message || "Unknown error");
          }
        }
        break;

      case "complete":
        if (data.summary) {
          setSummary(data.summary);
        }
        setStatus("completed");
        setIsLoading(false);
        // Track scrape completion
        if (jobIdRef.current && data.summary) {
          trackScrapeCompleted(jobIdRef.current, data.summary.total_leads);
        }
        break;
    }
  }, []);

  const connectSSE = useCallback(
    async (id: string) => {
      const url = await getStreamUrl(id);
      const es = new EventSource(url);
      esRef.current = es;

      // Listen for specific event types
      const eventTypes = ["status", "lead", "lead_update", "error", "complete"];

      eventTypes.forEach((eventType) => {
        es.addEventListener(eventType, (event) => {
          try {
            const data = JSON.parse(event.data) as SSEMessage;
            handleSSEMessage(eventType, data);

            // Close connection on terminal events
            if (eventType === "complete" || (eventType === "error" && !data.recoverable)) {
              es.close();
              esRef.current = null;
            }
          } catch (err) {
            console.error("Failed to parse SSE message:", err);
          }
        });
      });

      es.onopen = () => {
        setStatus("running");
      };

      es.onerror = () => {
        // EventSource auto-reconnects
        // Only set error if connection is permanently closed
        if (es.readyState === EventSource.CLOSED) {
          if (status === "running") {
            setError("Connection lost");
          }
          esRef.current = null;
        }
      };
    },
    [handleSSEMessage, status]
  );

  const disconnect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

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

        // Connect to SSE for real-time updates
        connectSSE(response.job_id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start scrape");
        setStatus("failed");
        setIsLoading(false);
      }
    },
    [connectSSE]
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
