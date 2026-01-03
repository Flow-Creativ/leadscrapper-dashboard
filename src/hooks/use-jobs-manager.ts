"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { startScrape, getWebSocketUrl, cancelJob, listJobs, getJobLeads, getAuthToken } from "@/lib/api";
import type {
  ScrapeRequest,
  JobProgress,
  JobSummary,
  Lead,
  WsMessage,
  JobStatus,
  JobStatusResponse,
} from "@/lib/types";

const MAX_CONCURRENT_JOBS = 1;
const MAX_RECENT_JOBS = 5;
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 3;

export interface JobState {
  jobId: string;
  query: string;
  status: JobStatus;
  progress: JobProgress | null;
  leads: Lead[];
  summary: JobSummary | null;
  error: string | null;
  startedAt: Date;
}

interface WebSocketConnection {
  ws: WebSocket;
  reconnectAttempts: number;
}

interface UseJobsManagerReturn {
  // State
  activeJobs: JobState[];
  recentJobs: JobState[];
  canStartNewJob: boolean;
  isStarting: boolean;

  // Actions
  startJob: (request: ScrapeRequest) => Promise<string | null>;
  cancelJob: (jobId: string) => Promise<void>;
  dismissJob: (jobId: string) => void;
}

export function useJobsManager(): UseJobsManagerReturn {
  const [jobs, setJobs] = useState<Map<string, JobState>>(new Map());
  const [recentJobs, setRecentJobs] = useState<JobState[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const wsConnections = useRef<Map<string, WebSocketConnection>>(new Map());
  const reconnectTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const connectWebSocketRef = useRef<((jobId: string, query: string) => void) | null>(null);
  const jobsRef = useRef<Map<string, JobState>>(new Map());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keep jobsRef in sync with jobs state
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  // Get active jobs (pending or running)
  const activeJobs = Array.from(jobs.values()).filter(
    (job) => job.status === "pending" || job.status === "running"
  );

  const canStartNewJob = activeJobs.length < MAX_CONCURRENT_JOBS;

  // Update a specific job's state
  const updateJob = useCallback(
    (jobId: string, update: Partial<JobState>) => {
      setJobs((prev) => {
        const newMap = new Map(prev);
        const job = newMap.get(jobId);
        if (job) {
          const updatedJob = { ...job, ...update };

          // If job completed/failed/cancelled, move to recent
          if (
            update.status &&
            ["completed", "failed", "cancelled"].includes(update.status) &&
            !["completed", "failed", "cancelled"].includes(job.status)
          ) {
            newMap.delete(jobId);
            setRecentJobs((prevRecent) => {
              // Filter out any existing job with same ID to prevent duplicates
              const filtered = prevRecent.filter((j) => j.jobId !== jobId);
              const newRecent = [updatedJob, ...filtered].slice(
                0,
                MAX_RECENT_JOBS
              );
              return newRecent;
            });
          } else {
            newMap.set(jobId, updatedJob);
          }
        }
        return newMap;
      });
    },
    []
  );

  // Handle WebSocket messages for a specific job
  const handleMessage = useCallback(
    (jobId: string, message: WsMessage) => {
      switch (message.type) {
        case "status":
          updateJob(jobId, {
            status: "running",
            progress: {
              step: message.step,
              current: message.current,
              total: message.total,
              message: message.message,
            },
          });
          break;

        case "lead":
          setJobs((prev) => {
            const newMap = new Map(prev);
            const job = newMap.get(jobId);
            if (job) {
              newMap.set(jobId, {
                ...job,
                leads: [...job.leads, message.data],
              });
            }
            return newMap;
          });
          break;

        case "error":
          updateJob(jobId, {
            error: message.message,
            status: message.recoverable ? "running" : "failed",
          });
          break;

        case "complete":
          updateJob(jobId, {
            summary: message.summary,
            status: "completed",
          });
          break;

        case "ping":
          // Ignore ping messages
          break;
      }
    },
    [updateJob]
  );

  // Connect WebSocket for a job
  const connectWebSocket = useCallback(
    async (jobId: string, query: string) => {
      let wsUrl = getWebSocketUrl(jobId);

      // Add auth token as query parameter (WebSocket doesn't support headers)
      const token = await getAuthToken();
      if (token) {
        wsUrl = `${wsUrl}?token=${encodeURIComponent(token)}`;
      }

      // Close existing connection if any
      const existing = wsConnections.current.get(jobId);
      if (existing) {
        existing.ws.close();
      }

      const ws = new WebSocket(wsUrl);
      wsConnections.current.set(jobId, { ws, reconnectAttempts: 0 });

      ws.onopen = () => {
        updateJob(jobId, { status: "running" });
        // Reset reconnect attempts on successful connection
        const conn = wsConnections.current.get(jobId);
        if (conn) {
          conn.reconnectAttempts = 0;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WsMessage = JSON.parse(event.data);
          handleMessage(jobId, message);
        } catch {
          console.error("Failed to parse WebSocket message:", event.data);
        }
      };

      ws.onclose = () => {
        // Check if job is still running and should reconnect
        const job = jobsRef.current.get(jobId);
        const conn = wsConnections.current.get(jobId);

        if (
          job &&
          job.status === "running" &&
          conn &&
          conn.reconnectAttempts < MAX_RECONNECT_ATTEMPTS
        ) {
          conn.reconnectAttempts++;

          // Clear any existing timeout
          const existingTimeout = reconnectTimeouts.current.get(jobId);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          // Schedule reconnection
          const timeout = setTimeout(() => {
            connectWebSocket(jobId, query);
          }, RECONNECT_DELAY);

          reconnectTimeouts.current.set(jobId, timeout);
        }
      };

      ws.onerror = () => {
        // Only set error if job is still pending/running and this is not a reconnection
        const conn = wsConnections.current.get(jobId);
        const job = jobsRef.current.get(jobId);
        if (job && (job.status === "pending" || job.status === "running") && conn && conn.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          updateJob(jobId, { error: "WebSocket connection error" });
        }
      };
    },
    [handleMessage, updateJob]
  );

  // Store connectWebSocket in ref for use in initialization effect
  useEffect(() => {
    connectWebSocketRef.current = connectWebSocket;
  }, [connectWebSocket]);

  // Load existing running jobs on mount
  useEffect(() => {
    if (isInitialized) return;

    const loadExistingJobs = async () => {
      // Parse date safely - handles both with and without Z suffix
      const parseDate = (dateStr: string | null | undefined): Date => {
        if (!dateStr) return new Date();
        // If it already has timezone info or Z, parse directly
        if (dateStr.includes('Z') || dateStr.includes('+')) {
          return new Date(dateStr);
        }
        // Otherwise append Z for UTC
        return new Date(dateStr + 'Z');
      };

      try {
        // Check if user is authenticated before loading jobs
        const token = await getAuthToken();
        if (!token) {
          // Not authenticated, skip loading jobs
          setIsInitialized(true);
          return;
        }

        const response = await listJobs();
        const runningJobs = response.jobs.filter(
          (job) => job.status === "pending" || job.status === "running"
        );
        const completedJobs = response.jobs.filter(
          (job) => job.status === "completed" || job.status === "failed" || job.status === "cancelled"
        );

        // Add running jobs to state and connect WebSockets
        if (runningJobs.length > 0) {
          const newJobsMap = new Map<string, JobState>();

          for (const apiJob of runningJobs) {
            // Fetch existing leads for this job
            let leads: Lead[] = [];
            try {
              leads = await getJobLeads(apiJob.job_id);
            } catch {
              // Job might not have leads yet
            }

            const jobState: JobState = {
              jobId: apiJob.job_id,
              query: apiJob.query,
              status: apiJob.status,
              progress: apiJob.progress,
              leads,
              summary: apiJob.summary,
              error: apiJob.error,
              startedAt: parseDate(apiJob.started_at || apiJob.created_at),
            };
            newJobsMap.set(apiJob.job_id, jobState);
          }

          setJobs(newJobsMap);

          // Connect WebSocket for each running job
          for (const apiJob of runningJobs) {
            if (connectWebSocketRef.current) {
              connectWebSocketRef.current(apiJob.job_id, apiJob.query);
            }
          }
        }

        // Add recent completed jobs
        if (completedJobs.length > 0) {
          const recentCompleted = completedJobs
            .slice(0, MAX_RECENT_JOBS)
            .map((apiJob): JobState => ({
              jobId: apiJob.job_id,
              query: apiJob.query,
              status: apiJob.status,
              progress: apiJob.progress,
              leads: [],
              summary: apiJob.summary,
              error: apiJob.error,
              startedAt: parseDate(apiJob.started_at || apiJob.created_at),
            }));
          setRecentJobs(recentCompleted);
        }
      } catch (err) {
        console.error("Failed to load existing jobs:", err);
      } finally {
        setIsInitialized(true);
      }
    };

    loadExistingJobs();
  }, [isInitialized]);

  // Start a new job
  const startJob = useCallback(
    async (request: ScrapeRequest): Promise<string | null> => {
      if (!canStartNewJob) {
        return null;
      }

      setIsStarting(true);

      try {
        const response = await startScrape(request);
        const jobId = response.job_id;

        // Add job to state
        const newJob: JobState = {
          jobId,
          query: request.query,
          status: "pending",
          progress: null,
          leads: [],
          summary: null,
          error: null,
          startedAt: new Date(),
        };

        setJobs((prev) => {
          const newMap = new Map(prev);
          newMap.set(jobId, newJob);
          return newMap;
        });

        // Connect WebSocket
        connectWebSocket(jobId, request.query);

        return jobId;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to start job";
        toast.error(message);
        return null;
      } finally {
        setIsStarting(false);
      }
    },
    [canStartNewJob, connectWebSocket]
  );

  // Cancel a job
  const handleCancelJob = useCallback(
    async (jobId: string) => {
      try {
        await cancelJob(jobId);
        updateJob(jobId, { status: "cancelled" });

        // Close WebSocket
        const conn = wsConnections.current.get(jobId);
        if (conn) {
          conn.ws.close();
          wsConnections.current.delete(jobId);
        }

        // Clear any reconnect timeout
        const timeout = reconnectTimeouts.current.get(jobId);
        if (timeout) {
          clearTimeout(timeout);
          reconnectTimeouts.current.delete(jobId);
        }
      } catch (err) {
        console.error("Failed to cancel job:", err);
      }
    },
    [updateJob]
  );

  // Dismiss a job from the recent list
  const dismissJob = useCallback((jobId: string) => {
    setRecentJobs((prev) => prev.filter((job) => job.jobId !== jobId));
  }, []);

  // Fallback API polling for active jobs (in case WebSocket disconnects)
  useEffect(() => {
    // Only poll if there are active jobs
    if (activeJobs.length === 0) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Poll every 5 seconds as fallback
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await listJobs();
        const parseDate = (dateStr: string | null | undefined): Date => {
          if (!dateStr) return new Date();
          if (dateStr.includes('Z') || dateStr.includes('+')) {
            return new Date(dateStr);
          }
          return new Date(dateStr + 'Z');
        };

        for (const apiJob of response.jobs) {
          const currentJob = jobsRef.current.get(apiJob.job_id);
          if (!currentJob) continue;

          // Only update if there are changes
          const hasProgressChange = JSON.stringify(currentJob.progress) !== JSON.stringify(apiJob.progress);
          const hasStatusChange = currentJob.status !== apiJob.status;

          if (hasProgressChange || hasStatusChange) {
            // Fetch leads if completed
            let leads = currentJob.leads;
            if (apiJob.status === "completed" && currentJob.status !== "completed") {
              try {
                leads = await getJobLeads(apiJob.job_id);
              } catch {
                // Keep existing leads
              }
            }

            updateJob(apiJob.job_id, {
              status: apiJob.status,
              progress: apiJob.progress,
              summary: apiJob.summary,
              error: apiJob.error,
              leads,
            });
          }
        }
      } catch (err) {
        console.error("Fallback polling error:", err);
      }
    }, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [activeJobs.length, updateJob]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Close all WebSocket connections
      wsConnections.current.forEach((conn) => {
        conn.ws.close();
      });
      wsConnections.current.clear();

      // Clear all reconnect timeouts
      reconnectTimeouts.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
      reconnectTimeouts.current.clear();
    };
  }, []);

  return {
    activeJobs,
    recentJobs,
    canStartNewJob,
    isStarting,
    startJob,
    cancelJob: handleCancelJob,
    dismissJob,
  };
}
