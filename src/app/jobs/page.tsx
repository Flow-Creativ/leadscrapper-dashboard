"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Plus, Download, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JobCard } from "@/components/job-card";
import { listJobs, bulkExportLeads } from "@/lib/api";
import { trackJobListViewed, trackLeadExported } from "@/lib/firebase/analytics";
import type { JobStatusResponse } from "@/lib/types";

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobStatusResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listJobs();
      setJobs(response.jobs);
      trackJobListViewed(response.jobs.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch jobs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkExport = async (format: "csv" | "json") => {
    setIsExporting(true);
    try {
      const blob = await bulkExportLeads(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `all_leads_export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      const completedJobs = jobs.filter(j => j.status === "completed");
      const totalLeads = completedJobs.reduce((sum, j) => sum + (j.summary?.total_leads || 0), 0);
      toast.success(`Exported ${totalLeads} leads as ${format.toUpperCase()}`);
      trackLeadExported(format, totalLeads);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    fetchJobs();

    // Refresh every 10 seconds if there are running jobs
    const interval = setInterval(() => {
      if (jobs.some((j) => j.status === "running" || j.status === "pending")) {
        fetchJobs();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const hasCompletedJobs = jobs.some(j => j.status === "completed");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs History</h1>
          <p className="text-muted-foreground">
            View past scrape jobs and their results
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasCompletedJobs && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export All
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleBulkExport("csv")}>
                  All Leads (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkExport("json")}>
                  All Leads (JSON)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="outline" onClick={fetchJobs} disabled={isLoading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/">
              <Plus className="mr-2 h-4 w-4" />
              New Scrape
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {isLoading && jobs.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No jobs found yet.</p>
          <Button asChild className="mt-4">
            <Link href="/">
              <Plus className="mr-2 h-4 w-4" />
              Start Your First Scrape
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <JobCard key={job.job_id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
