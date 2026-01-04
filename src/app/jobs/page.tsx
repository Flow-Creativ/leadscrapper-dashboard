"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { RefreshCw, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/job-card";
import { listJobs } from "@/lib/api";
import { trackJobListViewed } from "@/lib/firebase/analytics";
import type { JobStatusResponse } from "@/lib/types";

const POLLING_INTERVAL = 10000; // 10s for list view

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobStatusResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const jobsRef = useRef<JobStatusResponse[]>([]);

  // Keep jobsRef in sync
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const fetchJobs = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchJobs();

    // Refresh every 10 seconds only if there are running jobs
    const interval = setInterval(() => {
      const hasActiveJobs = jobsRef.current.some(
        (j) => j.status === "running" || j.status === "pending"
      );
      if (hasActiveJobs) {
        fetchJobs();
      }
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchJobs]);

  const handleJobDeleted = (jobId: string) => {
    setJobs(jobs.filter(j => j.job_id !== jobId));
  };

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
            <JobCard key={job.job_id} job={job} onJobDeleted={handleJobDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}
