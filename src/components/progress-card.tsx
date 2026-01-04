"use client";

import { useEffect, useState } from "react";
import { Loader2, XCircle, Clock, CheckCircle2, RotateCcw, AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { JobProgress, JobStatus, JobSummary } from "@/lib/types";

interface ProgressCardProps {
  status: JobStatus | null;
  progress: JobProgress | null;
  summary: JobSummary | null;
  error: string | null;
  startedAt?: string | null;
  onCancel: () => void;
  isCancelling?: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
  canResume?: boolean;
  leadCount?: number;
  tierCounts?: { hot: number; warm: number; cold: number };
}

export function ProgressCard({
  status,
  progress,
  summary,
  error,
  startedAt,
  onCancel,
  isCancelling = false,
  onRetry,
  isRetrying = false,
  canResume = false,
  leadCount = 0,
  tierCounts,
}: ProgressCardProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Calculate initial elapsed time from startedAt
  const getInitialElapsed = () => {
    if (!startedAt) return 0;
    const start = new Date(startedAt.includes('Z') || startedAt.includes('+') ? startedAt : startedAt + 'Z');
    return Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
  };

  // Track elapsed time
  useEffect(() => {
    if (status === "running" || status === "pending") {
      // Set initial elapsed time from startedAt
      setElapsedSeconds(getInitialElapsed());

      const interval = setInterval(() => {
        setElapsedSeconds(getInitialElapsed());
      }, 1000);
      return () => clearInterval(interval);
    } else if (status === null) {
      setElapsedSeconds(0);
    }
  }, [status, startedAt]);

  if (!status) return null;

  const progressPercent = progress
    ? Math.round((progress.current / Math.max(progress.total, 1)) * 100)
    : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {status === "running" || status === "pending" ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            ) : status === "completed" ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : status === "failed" || status === "cancelled" ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : null}
            {status === "pending"
              ? "Starting..."
              : status === "running"
              ? "Scraping in Progress"
              : status === "completed"
              ? "Scrape Complete"
              : status === "failed"
              ? "Scrape Failed"
              : "Cancelled"}
          </span>
          <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
            <Clock className="h-4 w-4" />
            {summary?.duration_seconds
              ? formatTime(Math.round(summary.duration_seconds))
              : formatTime(elapsedSeconds)}
          </span>
        </CardTitle>
        {progress && (
          <CardDescription>{progress.message}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {(status === "running" || status === "pending") && (
          <>
            <Progress value={progressPercent} className="h-2" />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {progress
                  ? `${progress.current} / ${progress.total}`
                  : "Initializing..."}
              </span>
              <span>{progressPercent}%</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isCancelling}
              className="w-full"
            >
              {isCancelling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              {isCancelling ? "Cancelling..." : "Cancel"}
            </Button>
          </>
        )}

        {status === "completed" && summary && (
          // Use leadCount as fallback if summary.total_leads is wrong
          (summary.total_leads === 0 && leadCount === 0) ? (
            // Check if all leads were duplicates
            summary.duplicates_skipped && summary.duplicates_skipped > 0 ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-950">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        All leads already exist
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Found {summary.total_scraped} businesses, but {summary.duplicates_skipped} were already in your previous jobs.
                      </p>
                    </div>
                  </div>
                </div>
                {summary.duplicate_jobs && summary.duplicate_jobs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">View existing leads in:</p>
                    <div className="flex flex-wrap gap-2">
                      {summary.duplicate_jobs.map((jobId) => (
                        <Link key={jobId} href={`/jobs/${jobId}`}>
                          <Button variant="outline" size="sm" className="gap-1">
                            Job {jobId.slice(0, 8)}
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-muted-foreground">0</div>
                <p className="text-sm text-muted-foreground">
                  No businesses found. Try a different query with a business category and location.
                </p>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  {/* Use leadCount if summary.total_leads is 0 but we have actual leads */}
                  <div className="text-2xl font-bold">
                    {summary.total_leads > 0 ? summary.total_leads : leadCount}
                  </div>
                  <div className="text-xs text-muted-foreground">New</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-500">
                    {summary.hot > 0 ? summary.hot : (tierCounts?.hot ?? 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Hot</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-500">
                    {summary.warm > 0 ? summary.warm : (tierCounts?.warm ?? 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Warm</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-500">
                    {summary.cold > 0 ? summary.cold : (tierCounts?.cold ?? 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Cold</div>
                </div>
              </div>
              {/* Show deduplication info if any leads were skipped */}
              {summary.duplicates_skipped != null && summary.duplicates_skipped > 0 && (
                <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {summary.duplicates_skipped} duplicate{summary.duplicates_skipped > 1 ? "s" : ""} skipped from previous jobs
                  </p>
                  {summary.duplicate_jobs && summary.duplicate_jobs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {summary.duplicate_jobs.map((jobId) => (
                        <Link key={jobId} href={`/jobs/${jobId}`}>
                          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
                            {jobId.slice(0, 8)}
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {(status === "failed" || status === "cancelled") && onRetry && (
          <div className="space-y-2">
            {canResume && leadCount > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                {leadCount} lead{leadCount > 1 ? "s" : ""} saved • Will continue from where it left off
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={isRetrying}
              className="w-full"
            >
              {isRetrying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              {canResume ? "Resume Job" : "Retry Job"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
