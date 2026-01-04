"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { startScrape, getStreamUrl, cancelJob, listJobs, getJobLeads, getAuthToken } from "@/lib/api";
import type {
  ScrapeRequest,
  JobProgress,
  JobSummary,
  Lead,
  JobStatus,
  JobStatusResponse,
  SSEMessage,
} from "@/lib/types";

const MAX_CONCURRENT_JOBS = parseInt(process.env.NEXT_PUBLIC_MAX_CONCURRENT_JOBS || "1", 10);
const MAX_RECENT_JOBS = 5;
const POLLING_INTERVAL = 10000; // Fallback polling every 10s

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

  // SSE connections
  const sseConnections = useRef<Map<string, EventSource>>(new Map());
  const jobsRef = useRef<Map<string, JobState>>(new Map());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Track jobs where SSE has failed (for smart fallback polling)
  const sseFailedJobs = useRef<Set<string>>(new Set());

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
              const newRecent = [updatedJob, ...filtered].slice(0, MAX_RECENT_JOBS);
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

  // Handle SSE message for a specific job
  const handleSSEMessage = useCallback(
    (jobId: string, eventType: string, data: SSEMessage) => {
      switch (eventType) {
        case "status":
          updateJob(jobId, {
            status: "running",
            progress: {
              step: data.step || "",
              current: data.current || 0,
              total: data.total || 0,
              message: data.message || null,
            },
          });
          break;

        case "lead":
          setJobs((prev) => {
            const newMap = new Map(prev);
            const job = newMap.get(jobId);
            if (job && data.data) {
              newMap.set(jobId, {
                ...job,
                leads: [...job.leads, data.data as Lead],
              });
            }
            return newMap;
          });
          break;

        case "lead_update":
          // Update existing lead with enriched data
          setJobs((prev) => {
            const newMap = new Map(prev);
            const job = newMap.get(jobId);
            if (job && data.data) {
              const updatedLead = data.data as Lead;
              const updatedLeads = job.leads.map((lead) =>
                lead.place_id === updatedLead.place_id ? updatedLead : lead
              );
              newMap.set(jobId, { ...job, leads: updatedLeads });
            }
            return newMap;
          });
          break;

        case "error":
          updateJob(jobId, {
            error: data.message || "An error occurred",
            status: data.recoverable ? "running" : "failed",
          });
          break;

        case "complete":
          updateJob(jobId, {
            summary: data.summary || null,
            status: "completed",
          });
          break;
      }
    },
    [updateJob]
  );

  // Connect SSE for a job
  const connectSSE = useCallback(
    async (jobId: string) => {
      // Close existing connection if any
      const existing = sseConnections.current.get(jobId);
      if (existing) {
        existing.close();
      }

      const url = await getStreamUrl(jobId);
      const es = new EventSource(url);
      sseConnections.current.set(jobId, es);

      // Listen for specific event types
      const eventTypes = ["status", "lead", "lead_update", "error", "complete"];

      eventTypes.forEach((eventType) => {
        es.addEventListener(eventType, (event) => {
          try {
            const data = JSON.parse(event.data) as SSEMessage;
            handleSSEMessage(jobId, eventType, data);

            // Close connection on terminal events
            if (eventType === "complete" || (eventType === "error" && !data.recoverable)) {
              es.close();
              sseConnections.current.delete(jobId);
            }
          } catch (err) {
            console.error("Failed to parse SSE message:", err);
          }
        });
      });

      es.onopen = () => {
        updateJob(jobId, { status: "running" });
        // SSE connected successfully - remove from failed set to stop polling
        sseFailedJobs.current.delete(jobId);
      };

      es.onerror = () => {
        // EventSource auto-reconnects, so we just log
        // Only worry if readyState is CLOSED (permanent failure)
        if (es.readyState === EventSource.CLOSED) {
          // Check if job is still active before marking for polling fallback
          const job = jobsRef.current.get(jobId);
          if (job && (job.status === "pending" || job.status === "running")) {
            // Add to failed set - polling fallback will handle updates
            sseFailedJobs.current.add(jobId);
            console.warn("SSE connection closed for job:", jobId, "- falling back to polling");
          }
          sseConnections.current.delete(jobId);
        }
      };

      return es;
    },
    [handleSSEMessage, updateJob]
  );

  // Load existing running jobs on mount
  useEffect(() => {
    if (isInitialized) return;

    const loadExistingJobs = async () => {
      const parseDate = (dateStr: string | null | undefined): Date => {
        if (!dateStr) return new Date();
        if (dateStr.includes("Z") || dateStr.includes("+")) {
          return new Date(dateStr);
        }
        return new Date(dateStr + "Z");
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
          (job) =>
            job.status === "completed" ||
            job.status === "failed" ||
            job.status === "cancelled"
        );

        // Add running jobs to state and connect SSE
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

          // Connect SSE for each running job
          for (const apiJob of runningJobs) {
            connectSSE(apiJob.job_id);
          }
        }

        // Add recent completed jobs
        if (completedJobs.length > 0) {
          const recentCompleted = completedJobs
            .slice(0, MAX_RECENT_JOBS)
            .map(
              (apiJob): JobState => ({
                jobId: apiJob.job_id,
                query: apiJob.query,
                status: apiJob.status,
                progress: apiJob.progress,
                leads: [],
                summary: apiJob.summary,
                error: apiJob.error,
                startedAt: parseDate(apiJob.started_at || apiJob.created_at),
              })
            );
          setRecentJobs(recentCompleted);
        }
      } catch (err) {
        console.error("Failed to load existing jobs:", err);
      } finally {
        setIsInitialized(true);
      }
    };

    loadExistingJobs();
  }, [isInitialized, connectSSE]);

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

        // Connect SSE
        connectSSE(jobId);

        return jobId;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to start job";
        toast.error(message);
        return null;
      } finally {
        setIsStarting(false);
      }
    },
    [canStartNewJob, connectSSE]
  );

  // Cancel a job
  const handleCancelJob = useCallback(
    async (jobId: string) => {
      try {
        await cancelJob(jobId);
        updateJob(jobId, { status: "cancelled" });

        // Close SSE connection
        const es = sseConnections.current.get(jobId);
        if (es) {
          es.close();
          sseConnections.current.delete(jobId);
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

  // Smart fallback polling - only poll for jobs where SSE has failed
  useEffect(() => {
    // Only poll if there are active jobs
    if (activeJobs.length === 0) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Smart fallback: only poll if at least one job has failed SSE
    pollingIntervalRef.current = setInterval(async () => {
      // Get jobs that need polling (SSE failed)
      const jobsNeedingPoll = activeJobs.filter((job) =>
        sseFailedJobs.current.has(job.jobId)
      );

      // Skip polling if all jobs have working SSE connections
      if (jobsNeedingPoll.length === 0) {
        return;
      }

      console.log(`Polling ${jobsNeedingPoll.length} job(s) with failed SSE`);

      try {
        const response = await listJobs();
        const parseDate = (dateStr: string | null | undefined): Date => {
          if (!dateStr) return new Date();
          if (dateStr.includes("Z") || dateStr.includes("+")) {
            return new Date(dateStr);
          }
          return new Date(dateStr + "Z");
        };

        for (const apiJob of response.jobs) {
          // Only update jobs that are in the failed SSE set
          if (!sseFailedJobs.current.has(apiJob.job_id)) continue;

          const currentJob = jobsRef.current.get(apiJob.job_id);
          if (!currentJob) continue;

          // Only update if there are changes
          const hasProgressChange =
            JSON.stringify(currentJob.progress) !== JSON.stringify(apiJob.progress);
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

            // If job completed/failed, remove from failed set
            if (["completed", "failed", "cancelled"].includes(apiJob.status)) {
              sseFailedJobs.current.delete(apiJob.job_id);
            }
          }
        }
      } catch (err) {
        console.error("Fallback polling error:", err);
      }
    }, POLLING_INTERVAL);

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
      // Close all SSE connections
      sseConnections.current.forEach((es) => {
        es.close();
      });
      sseConnections.current.clear();
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
