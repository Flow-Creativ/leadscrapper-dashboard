"use client";

import Link from "next/link";
import { AlertTriangle, ExternalLink, Sparkles, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SimilarJob } from "@/lib/types";

interface DuplicateQueryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  similarJobs: SimilarJob[];
  suggestions: string[];
  message: string | null;
  onProceed: () => void;
  onUseSuggestion: (suggestion: string) => void;
}

export function DuplicateQueryModal({
  open,
  onOpenChange,
  query,
  similarJobs,
  suggestions,
  message,
  onProceed,
  onUseSuggestion,
}: DuplicateQueryModalProps) {
  const exactMatch = similarJobs.find((j) => j.match_type === "exact");
  const totalExistingLeads = similarJobs.reduce((sum, j) => sum + j.total_leads, 0);

  // Prioritize jobs with leads, then sort by most recent
  const sortedJobs = [...similarJobs].sort((a, b) => {
    // Jobs with leads come first
    if (a.total_leads > 0 && b.total_leads === 0) return -1;
    if (a.total_leads === 0 && b.total_leads > 0) return 1;
    // Then by date (most recent first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Show up to 3 jobs, preferring ones with leads
  const jobsToShow = sortedJobs.slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {exactMatch ? "Query Already Searched" : "Similar Queries Found"}
          </DialogTitle>
          <DialogDescription>
            {message || "You have similar searches in your history."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Jobs Section */}
          <div className="rounded-lg border p-3 space-y-2">
            <h4 className="text-sm font-medium">Your previous searches:</h4>
            <div className="space-y-1">
              {jobsToShow.map((job) => (
                <Link
                  key={job.job_id}
                  href={`/jobs/${job.job_id}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-muted text-sm"
                >
                  <span className="truncate flex-1">{job.query}</span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span>{job.total_leads} leads</span>
                    <ExternalLink className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
            {totalExistingLeads > 0 && (
              <p className="text-xs text-muted-foreground">
                Total: {totalExistingLeads} leads across {similarJobs.length} similar {similarJobs.length === 1 ? "search" : "searches"}.
              </p>
            )}
          </div>

          {/* LLM Suggestions Section */}
          {suggestions.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2 dark:border-blue-800 dark:bg-blue-950">
              <h4 className="text-sm font-medium flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-blue-500" />
                Try these instead:
              </h4>
              <div className="space-y-1">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => onUseSuggestion(suggestion)}
                    className="w-full flex items-center justify-between p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-sm text-left"
                  >
                    <span>{suggestion}</span>
                    <ArrowRight className="h-4 w-4 text-blue-500" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="sm:flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={onProceed}
            className="sm:flex-1"
          >
            Search Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
