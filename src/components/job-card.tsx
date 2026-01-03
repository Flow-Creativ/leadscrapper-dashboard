"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Flame,
  Download,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { parseApiDate } from "@/lib/date-utils";
import { exportJobLeads, startScrape, deleteJob } from "@/lib/api";
import { trackNavigation, trackLeadExported } from "@/lib/firebase/analytics";
import type { JobStatusResponse } from "@/lib/types";

interface JobCardProps {
  job: JobStatusResponse;
  onJobDeleted?: (jobId: string) => void;
}

export function JobCard({ job, onJobDeleted }: JobCardProps) {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const StatusIcon = {
    pending: Loader2,
    running: Loader2,
    completed: CheckCircle2,
    failed: XCircle,
    cancelled: XCircle,
  }[job.status];

  const statusColor = {
    pending: "text-yellow-500",
    running: "text-blue-500",
    completed: "text-green-500",
    failed: "text-red-500",
    cancelled: "text-gray-500",
  }[job.status];

  const handleExport = async (format: "csv" | "json") => {
    setIsExporting(true);
    try {
      const blob = await exportJobLeads(job.job_id, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads_${job.job_id}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Exported as ${format.toUpperCase()}`);
      trackLeadExported(format, job.summary?.total_leads || 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleRetry = async () => {
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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this job? This cannot be undone.")) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteJob(job.job_id);
      toast.success("Job deleted");
      onJobDeleted?.(job.job_id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete job");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <StatusIcon
              className={`h-5 w-5 ${statusColor} ${
                job.status === "running" || job.status === "pending"
                  ? "animate-spin"
                  : ""
              }`}
            />
            {job.query}
          </CardTitle>
          <Badge variant="outline" className="capitalize">
            {job.status}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(parseApiDate(job.created_at), { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          {job.summary ? (
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium">{job.summary.total_leads} leads</span>
              <span className="flex items-center gap-1 text-red-500">
                <Flame className="h-4 w-4" />
                {job.summary.hot}
              </span>
              <span className="text-yellow-500">{job.summary.warm} warm</span>
              <span className="text-blue-500">{job.summary.cold} cold</span>
            </div>
          ) : job.progress ? (
            <span className="text-sm text-muted-foreground">
              {job.progress.message}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">
              {job.error || "Waiting..."}
            </span>
          )}
          <div className="flex items-center gap-1">
            {(job.status === "failed" || job.status === "cancelled") && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRetry}
                  disabled={isRetrying || isDeleting}
                >
                  {isRetrying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  <span className="ml-1">Retry</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting || isRetrying}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}
            {job.status === "completed" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={isExporting}>
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport("csv")}>
                    Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("json")}>
                    Export JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link
                href={`/jobs/${job.job_id}`}
                onClick={() => trackNavigation(`/jobs/${job.job_id}`, "job_card")}
              >
                View
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
