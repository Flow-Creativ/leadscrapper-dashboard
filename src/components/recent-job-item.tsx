import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, XCircle, ArrowRight, Flame, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JobState } from "@/hooks/use-jobs-manager";

interface RecentJobItemProps {
  job: JobState;
  onDismiss: (jobId: string) => void;
}

export function RecentJobItem({ job, onDismiss }: RecentJobItemProps) {
  const isCompleted = job.status === "completed";
  const StatusIcon = isCompleted ? CheckCircle2 : XCircle;
  const statusColor = isCompleted ? "text-green-500" : "text-red-500";

  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <StatusIcon className={`h-5 w-5 flex-shrink-0 ${statusColor}`} />

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm">{job.query}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {job.summary ? (
              <>
                <span>{job.summary.total_leads} leads</span>
                {job.summary.hot > 0 && (
                  <span className="flex items-center gap-0.5 text-red-500">
                    <Flame className="h-3 w-3" />
                    {job.summary.hot}
                  </span>
                )}
                <span>
                  {formatDistanceToNow(job.startedAt, { addSuffix: true })}
                </span>
              </>
            ) : (
              <span>
                {job.error || "Failed"} -{" "}
                {formatDistanceToNow(job.startedAt, { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 ml-2">
        <Button variant="ghost" size="sm" className="h-8" asChild>
          <Link href={`/jobs/${job.jobId}`}>
            View
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => onDismiss(job.jobId)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
