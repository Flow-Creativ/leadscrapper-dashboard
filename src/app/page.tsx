"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { History, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrapeForm } from "@/components/scrape-form";
import { ActiveJobCard } from "@/components/active-job-card";
import { RecentJobItem } from "@/components/recent-job-item";
import { LeadsTable } from "@/components/leads-table";
import { useJobsManager } from "@/hooks/use-jobs-manager";
import { useAuth } from "@/components/providers/auth-provider";
import { getDemoLeads } from "@/lib/api";
import type { ScrapeRequest, Lead } from "@/lib/types";

const MAX_CONCURRENT_JOBS = 3;

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [demoLeads, setDemoLeads] = useState<Lead[]>([]);
  const {
    activeJobs,
    recentJobs,
    canStartNewJob,
    isStarting,
    startJob,
    cancelJob,
    dismissJob,
  } = useJobsManager();

  // Fetch demo leads for unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      getDemoLeads().then(setDemoLeads);
    }
  }, [authLoading, user]);

  const handleSubmit = async (request: ScrapeRequest) => {
    // Redirect to signin if not authenticated
    if (!user) {
      router.push("/auth/signin");
      return;
    }
    await startJob(request);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Scrape Google Maps for business leads
          </p>
        </div>
        {user && (
          <Button variant="outline" asChild>
            <Link href="/jobs">
              <History className="mr-2 h-4 w-4" />
              View History
            </Link>
          </Button>
        )}
      </div>

      {/* Scrape Form */}
      <ScrapeForm
        onSubmit={handleSubmit}
        isLoading={isStarting}
        disabled={user ? !canStartNewJob : false}
        disabledMessage={user ? `Maximum ${MAX_CONCURRENT_JOBS} concurrent jobs reached. Wait for a job to complete or cancel one.` : undefined}
      />

      {/* Active Jobs Section */}
      {activeJobs.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Active Jobs ({activeJobs.length})
            </h2>
            <span className="text-sm text-muted-foreground">
              {MAX_CONCURRENT_JOBS - activeJobs.length} slots available
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeJobs.map((job) => (
              <ActiveJobCard
                key={job.jobId}
                job={job}
                onCancel={cancelJob}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recent Completed Section */}
      {recentJobs.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Completed</h2>
          <div className="space-y-2">
            {recentJobs.map((job) => (
              <RecentJobItem
                key={job.jobId}
                job={job}
                onDismiss={dismissJob}
              />
            ))}
          </div>
        </section>
      )}

      {/* Demo Section for Unauthenticated Users */}
      {!user && demoLeads.length > 0 && (
        <section className="space-y-4">
          <div className="rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 p-6">
            <h2 className="text-lg font-semibold">Sample Results</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Here&apos;s what you can discover. Sign in to start your own scrape!
            </p>
            <div className="bg-background rounded-lg border">
              <LeadsTable leads={demoLeads} isLoading={false} />
            </div>
            <div className="mt-4 flex justify-center">
              <Button asChild>
                <Link href="/auth/signin">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in to get started
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Empty State for Authenticated Users */}
      {user && activeJobs.length === 0 && recentJobs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No jobs yet. Start your first scrape above!
          </p>
        </div>
      )}
    </div>
  );
}
