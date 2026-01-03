"use client";

import { useEffect, useState } from "react";
import { Loader2, XCircle, Clock, CheckCircle2, RotateCcw } from "lucide-react";
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
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function ProgressCard({
  status,
  progress,
  summary,
  error,
  startedAt,
  onCancel,
  onRetry,
  isRetrying = false,
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
              className="w-full"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </>
        )}

        {status === "completed" && summary && (
          summary.total_leads === 0 ? (
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-muted-foreground">0</div>
              <p className="text-sm text-muted-foreground">
                No businesses found. Try a different query with a business category and location.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{summary.total_leads}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">{summary.hot}</div>
                <div className="text-xs text-muted-foreground">Hot</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-500">{summary.warm}</div>
                <div className="text-xs text-muted-foreground">Warm</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-500">{summary.cold}</div>
                <div className="text-xs text-muted-foreground">Cold</div>
              </div>
            </div>
          )
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {(status === "failed" || status === "cancelled") && onRetry && (
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
            Retry Job
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
