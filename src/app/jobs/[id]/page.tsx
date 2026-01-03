"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Download, RotateCcw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProgressCard } from "@/components/progress-card";
import { LeadsTable } from "@/components/leads-table";
import { getJobStatus, getJobLeads, exportJobLeads, startScrape } from "@/lib/api";
import { trackJobDetailViewed, trackLeadExported } from "@/lib/firebase/analytics";
import type { JobStatusResponse, Lead } from "@/lib/types";

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
  const [error, setError] = useState<string | null>(null);

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

  const handleRetry = async () => {
    if (!job) return;
    setIsRetrying(true);
    try {
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to retry job");
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

  // Auto-refresh for running jobs
  useEffect(() => {
    if (job?.status !== "running" && job?.status !== "pending") {
      return;
    }

    const interval = setInterval(() => {
      fetchData();
    }, 3000); // Poll every 3 seconds for running jobs

    return () => clearInterval(interval);
  }, [jobId, job?.status]);

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
              onClick={handleRetry}
              disabled={isRetrying}
            >
              <RotateCcw
                className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
              />
              Retry
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
          />
        </div>
        <div>
          <ProgressCard
            status={job.status}
            progress={job.progress}
            summary={job.summary}
            error={job.error}
            startedAt={job.started_at}
            onCancel={() => {}}
            onRetry={handleRetry}
            isRetrying={isRetrying}
          />
        </div>
      </div>
    </div>
  );
}
