"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Download, RotateCcw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProgressCard } from "@/components/progress-card";
import { LeadsTable } from "@/components/leads-table";
import { getJobStatus, getJobLeads, exportJobLeads, startScrape, getStreamUrl, resumeJob, cancelJob } from "@/lib/api";
import { trackJobDetailViewed, trackLeadExported } from "@/lib/firebase/analytics";
import type { JobStatusResponse, Lead, SSEMessage } from "@/lib/types";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const hasTrackedView = useRef(false);

  const [job, setJob] = useState<JobStatusResponse | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SSE refs for smart fallback
  const esRef = useRef<EventSource | null>(null);
  const sseFailedRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const POLLING_INTERVAL = 5000; // 5s fallback polling

  const handleExport = async (format: "csv" | "json") => {
    setIsExporting(true);
    try {
      const blob = await exportJobLeads(jobId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads_${jobId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Leads exported as ${format.toUpperCase()}`);
      trackLeadExported(format, leads.length);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancel = async () => {
    // Only cancel if job is running or pending
    if (job?.status !== "running" && job?.status !== "pending") {
      return;
    }
    setIsCancelling(true);
    try {
      await cancelJob(jobId);
      toast.success("Job cancelled");
      // Update local state immediately
      setJob((prev) => prev ? { ...prev, status: "cancelled" } : prev);
      // Close SSE connection
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    } catch (err) {
      // Ignore "already cancelled" errors
      const message = err instanceof Error ? err.message : "";
      if (!message.includes("Cannot cancel")) {
        toast.error(message || "Failed to cancel job");
      }
    } finally {
      setIsCancelling(false);
    }
  };

  // Determine if job can be resumed (failed/cancelled with leads) vs needs retry (no leads)
  const canResume = (job?.status === "failed" || job?.status === "cancelled") && leads.length > 0;

  // Calculate tier counts from actual leads (fallback for incorrect summary)
  const tierCounts = leads.reduce(
    (acc, lead) => {
      const tier = lead.tier?.toLowerCase();
      if (tier === "hot") acc.hot++;
      else if (tier === "warm") acc.warm++;
      else acc.cold++;
      return acc;
    },
    { hot: 0, warm: 0, cold: 0 }
  );

  const handleRetryOrResume = async () => {
    if (!job) return;
    setIsRetrying(true);
    try {
      if (canResume) {
        // Resume: continue from where we left off
        await resumeJob(jobId);
        toast.success(`Job resumed - continuing with ${leads.length} existing leads`);
        // Stay on same page, SSE will update progress
        // Reset state for resumed job
        setError(null);
        sseFailedRef.current = false;
        // Re-fetch to get current job status and existing leads
        await fetchData();
        // Reconnect SSE for updates
        connectSSE();
      } else {
        // Retry: create new job with same parameters
        const result = await startScrape({
          query: job.query,
          max_results: job.max_results ?? undefined,
          min_score: job.min_score ?? undefined,
          skip_enrichment: job.skip_enrichment ?? undefined,
          skip_outreach: job.skip_outreach ?? undefined,
          product_context: job.product_context ?? undefined,
        });
        toast.success("Job restarted");
        router.push(`/jobs/${result.job_id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${canResume ? "resume" : "retry"} job`);
    } finally {
      setIsRetrying(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [jobData, leadsData] = await Promise.all([
        getJobStatus(jobId),
        getJobLeads(jobId).catch(() => []),
      ]);
      setJob(jobData);
      setLeads(leadsData);

      // Track job detail view only once per page load
      if (!hasTrackedView.current) {
        trackJobDetailViewed(jobId, jobData.status);
        hasTrackedView.current = true;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch job");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [jobId]);

  // SSE connection for real-time updates
  const connectSSE = useCallback(async () => {
    // Close existing connection
    if (esRef.current) {
      esRef.current.close();
    }

    const url = await getStreamUrl(jobId);
    const es = new EventSource(url);
    esRef.current = es;

    const eventTypes = ["status", "lead", "lead_update", "error", "complete"];

    eventTypes.forEach((eventType) => {
      es.addEventListener(eventType, (event) => {
        try {
          // Safety check for undefined or invalid data
          if (!event.data || event.data === "undefined") {
            console.warn("SSE received invalid data:", eventType, event.data);
            return;
          }
          const data = JSON.parse(event.data) as SSEMessage;

          switch (eventType) {
            case "status":
              setJob((prev) =>
                prev
                  ? {
                      ...prev,
                      status: "running",
                      progress: {
                        step: data.step || "",
                        current: data.current || 0,
                        total: data.total || 0,
                        message: data.message || null,
                      },
                    }
                  : prev
              );
              break;

            case "lead":
              if (data.data) {
                const newLead = data.data as Lead;
                setLeads((prev) => {
                  // Deduplicate by place_id to avoid showing same lead twice
                  const exists = prev.some((lead) => lead.place_id === newLead.place_id);
                  if (exists) {
                    return prev;
                  }
                  return [...prev, newLead];
                });
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
              if (!data.recoverable) {
                setJob((prev) =>
                  prev ? { ...prev, status: "failed", error: data.message || null } : prev
                );
              }
              break;

            case "complete":
              setJob((prev) =>
                prev
                  ? {
                      ...prev,
                      status: "completed",
                      summary: data.summary || prev.summary,
                    }
                  : prev
              );
              break;
          }

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
      // SSE connected - stop fallback polling
      sseFailedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        // SSE permanently failed - enable fallback polling
        sseFailedRef.current = true;
        console.warn("SSE connection closed for job:", jobId, "- falling back to polling");
        esRef.current = null;
      }
    };
  }, [jobId]);

  // SSE + smart fallback polling for running jobs
  useEffect(() => {
    const isRunning = job?.status === "running" || job?.status === "pending";

    if (!isRunning) {
      // Clean up on terminal status
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Connect SSE for running jobs
    connectSSE();

    // Smart fallback polling - only poll when SSE fails
    pollingIntervalRef.current = setInterval(() => {
      if (!sseFailedRef.current) {
        return; // SSE is working, skip polling
      }
      console.log("Fallback polling for job:", jobId);
      fetchData();
    }, POLLING_INTERVAL);

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [jobId, job?.status, connectSSE]);

  if (isLoading && !job) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href="/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Link>
        </Button>
        <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href="/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Link>
        </Button>
        <p>Job not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/jobs">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{job.query}</h1>
            <p className="text-sm text-muted-foreground">Job ID: {job.job_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(job.status === "failed" || job.status === "cancelled") && (
            <Button
              variant="outline"
              onClick={handleRetryOrResume}
              disabled={isRetrying}
            >
              <RotateCcw
                className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
              />
              {canResume ? "Resume" : "Retry"}
            </Button>
          )}
          <Button variant="outline" onClick={fetchData} disabled={isLoading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {leads.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={() => handleExport("csv")}
                disabled={isExporting}
              >
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport("json")}
                disabled={isExporting}
              >
                <Download className="mr-2 h-4 w-4" />
                JSON
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <LeadsTable
            leads={leads}
            isLoading={job.status === "running"}
            jobStatus={job.status}
            jobProgress={job.progress}
          />
        </div>
        <div>
          <ProgressCard
            status={job.status}
            progress={job.progress}
            summary={job.summary}
            error={job.error}
            startedAt={job.started_at}
            onCancel={handleCancel}
            isCancelling={isCancelling}
            onRetry={handleRetryOrResume}
            isRetrying={isRetrying}
            canResume={canResume}
            leadCount={leads.length}
            tierCounts={tierCounts}
          />
        </div>
      </div>
    </div>
  );
}
