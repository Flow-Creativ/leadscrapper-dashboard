"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trackJobCancelled, trackNavigation } from "@/lib/firebase/analytics";
import type { JobState } from "@/hooks/use-jobs-manager";

interface ActiveJobCardProps {
  job: JobState;
  onCancel: (jobId: string) => void;
}

export function ActiveJobCard({ job, onCancel }: ActiveJobCardProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Track elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - job.startedAt.getTime()) / 1000
      );
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [job.startedAt]);

  const handleCancel = () => {
    trackJobCancelled(job.jobId, job.query);
    onCancel(job.jobId);
  };

  const handleViewDetails = () => {
    trackNavigation(`/jobs/${job.jobId}`, "active_job_card");
  };

  const progressPercent = job.progress
    ? Math.round((job.progress.current / Math.max(job.progress.total, 1)) * 100)
    : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <Card className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6 text-muted-foreground hover:text-destructive"
        onClick={handleCancel}
      >
        <X className="h-4 w-4" />
      </Button>

      <CardHeader className="pb-2 pr-10">
        <CardTitle className="flex items-center gap-2 text-base">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="truncate">{job.query}</span>
        </CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span>
            {job.progress?.message ||
              (job.status === "pending" ? "Starting..." : "Initializing...")}
          </span>
          <span className="text-xs">{formatTime(elapsedSeconds)}</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Progress value={progressPercent} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {job.progress
                ? `${job.progress.current} / ${job.progress.total}`
                : "0 / 0"}
            </span>
            <span>{progressPercent}%</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            {job.leads.length} leads found
          </Badge>
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link href={`/jobs/${job.jobId}`} onClick={handleViewDetails}>
              View Details
              <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>

        {job.error && (
          <div className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 dark:bg-red-950 dark:text-red-400">
            {job.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
