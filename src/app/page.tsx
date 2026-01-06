"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { History, LogIn, Sparkles, Target, Zap } from "lucide-react";
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { ScrapeForm } from "@/components/scrape-form";
import { ActiveJobCard } from "@/components/active-job-card";
import { RecentJobItem } from "@/components/recent-job-item";
import { LeadsTable } from "@/components/leads-table";
import { useJobsManager } from "@/hooks/use-jobs-manager";
import { useAuth } from "@/components/providers/auth-provider";
import { getDemoLeads } from "@/lib/api";
import type { ScrapeRequest, Lead } from "@/lib/types";

export default function Dashboard() {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const tScrapeForm = useTranslations('scrapeForm');
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
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('subtitle')}
          </p>
        </div>
        {user && (
          <Button variant="outline" asChild>
            <Link href="/jobs">
              <History className="mr-2 h-4 w-4" />
              {t('viewHistory')}
            </Link>
          </Button>
        )}
      </div>

      {/* Scrape Form */}
      <ScrapeForm
        onSubmit={handleSubmit}
        isLoading={isStarting}
        disabled={user ? !canStartNewJob : false}
        disabledMessage={user ? tScrapeForm('disabledMessage') : undefined}
      />

      {/* Active Jobs Section */}
      {activeJobs.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            {t('activeSectionTitle', { count: activeJobs.length })}
          </h2>
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
          <h2 className="text-lg font-semibold">{t('recentSectionTitle')}</h2>
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
        <section className="space-y-6">
          {/* Feature Highlights */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
              <div className="rounded-full bg-primary/10 p-2">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">{t('features.findQualityLeads.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('features.findQualityLeads.description')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
              <div className="rounded-full bg-primary/10 p-2">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">{t('features.fastEnrichment.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('features.fastEnrichment.description')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
              <div className="rounded-full bg-primary/10 p-2">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">{t('features.aiOutreach.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('features.aiOutreach.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Sample Results */}
          <div className="relative rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/5 p-6">
            <div className="absolute -top-3 left-6">
              <span className="bg-background px-2 text-sm font-medium text-primary">
                {t('sampleResults.title')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t('sampleResults.description')}
            </p>
            <div className="bg-background rounded-lg border shadow-sm">
              <LeadsTable leads={demoLeads} isLoading={false} />
            </div>
            <div className="mt-6 flex justify-center">
              <Button size="lg" asChild className="shadow-lg">
                <Link href="/auth/signin">
                  <LogIn className="mr-2 h-4 w-4" />
                  {t('sampleResults.signInButton')}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Empty State for Authenticated Users */}
      {user && activeJobs.length === 0 && recentJobs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">{t('emptyState.title')}</h3>
          <p className="text-muted-foreground max-w-sm">
            {t('emptyState.description')}
          </p>
        </div>
      )}
    </div>
  );
}
