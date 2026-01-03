"use client";

import { useState } from "react";
import { Search, Settings2, Zap, Loader2, AlertCircle, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QueryWarningModal } from "@/components/query-warning-modal";
import { DuplicateQueryModal } from "@/components/duplicate-query-modal";
import { trackScrapeStarted } from "@/lib/firebase/analytics";
import { enhanceQuery, checkDuplicateQuery } from "@/lib/api";
import { handleApiError, isRateLimitError, isBannedError } from "@/lib/error-handler";
import type { ScrapeRequest, QueryEnhanceResponse, DuplicateCheckResponse } from "@/lib/types";
import { ApiError } from "@/lib/types";

interface ScrapeFormProps {
  onSubmit: (request: ScrapeRequest) => void;
  isLoading: boolean;
  disabled?: boolean;
  disabledMessage?: string;
  onBanned?: () => void; // Callback when user is banned
}

// Error state type
type FormError = {
  type: "rate_limit" | "banned" | "generic";
  message: string;
  retryAfter?: number;
} | null;

export function ScrapeForm({
  onSubmit,
  isLoading,
  disabled = false,
  disabledMessage,
  onBanned,
}: ScrapeFormProps) {
  const [query, setQuery] = useState("");
  const [maxResults, setMaxResults] = useState(10);
  const [minScore, setMinScore] = useState(0);
  const [skipEnrichment, setSkipEnrichment] = useState(false);
  const [skipOutreach, setSkipOutreach] = useState(false);
  const [productContext, setProductContext] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Submit-time query check state
  const [isChecking, setIsChecking] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingWarning, setPendingWarning] = useState<QueryEnhanceResponse | null>(null);
  const [formError, setFormError] = useState<FormError>(null);

  // Duplicate query check state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResponse | null>(null);
  const [skipDuplicateCheck, setSkipDuplicateCheck] = useState(false);

  const MAX_PRODUCT_CONTEXT_CHARS = 1000;
  const productContextChars = productContext.length;
  const isOverCharLimit = productContextChars > MAX_PRODUCT_CONTEXT_CHARS;
  const isFormDisabled = isLoading || disabled || isChecking;

  const submitScrape = () => {
    trackScrapeStarted(query.trim(), maxResults);
    onSubmit({
      query: query.trim(),
      max_results: maxResults,
      min_score: minScore,
      skip_enrichment: skipEnrichment,
      skip_outreach: skipOutreach,
      product_context: productContext || undefined,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isOverCharLimit) return;

    // Clear previous errors
    setFormError(null);
    setIsChecking(true);

    try {
      // Step 1: Check for duplicate queries (unless bypassed)
      if (!skipDuplicateCheck) {
        const dupResult = await checkDuplicateQuery(query.trim());
        if (dupResult.has_duplicates) {
          setDuplicateCheck(dupResult);
          setShowDuplicateModal(true);
          setIsChecking(false);
          return;
        }
      }
      // Reset the skip flag after use
      setSkipDuplicateCheck(false);

      // Step 2: Check query quality (existing enhancement check)
      const result = await enhanceQuery(query.trim());
      if (result.is_problematic) {
        setPendingWarning(result);
        setShowWarningModal(true);
        setIsChecking(false);
        return;
      }
    } catch (error) {
      setIsChecking(false);

      // Handle specific error types
      if (error instanceof ApiError) {
        if (error.isRateLimited) {
          setFormError({
            type: "rate_limit",
            message: "You're making requests too fast. Please wait before trying again.",
            retryAfter: error.retryAfter || 60,
          });
          handleApiError(error); // Show toast
          return;
        }

        if (error.isBanned) {
          setFormError({
            type: "banned",
            message: error.message || "Your account has been temporarily restricted. Please try again later.",
          });
          handleApiError(error); // Show toast
          onBanned?.(); // Notify parent
          return;
        }
      }

      // For other errors, proceed with scrape anyway
      // (don't block user on query check errors)
    }
    setIsChecking(false);

    // Query is good, submit directly
    submitScrape();
  };

  const handleProceedAnyway = () => {
    setShowWarningModal(false);
    setPendingWarning(null);
    submitScrape();
  };

  const handleUseSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    setShowWarningModal(false);
    setPendingWarning(null);
    setShowDuplicateModal(false);
    setDuplicateCheck(null);
  };

  const handleCloseModal = () => {
    setShowWarningModal(false);
    setPendingWarning(null);
  };

  // Handlers for duplicate query modal
  const handleProceedWithDuplicate = () => {
    setShowDuplicateModal(false);
    setSkipDuplicateCheck(true);
    // Re-trigger submit, skipping duplicate check this time
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    handleSubmit(fakeEvent);
  };

  const handleCloseDuplicateModal = () => {
    setShowDuplicateModal(false);
    setDuplicateCheck(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            New Scrape Job
          </CardTitle>
          <CardDescription>
            Search Google Maps for business leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Query Input */}
            <div className="space-y-2">
              <Label htmlFor="query">Search Query</Label>
              <Input
                id="query"
                placeholder="e.g., coffee shops in Jakarta"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isFormDisabled}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                Use business categories + location for best results
              </p>
              {!query && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Try:</span>
                  {["coffee shops in Jakarta", "restaurants in Kemang", "salons near Sudirman"].map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setQuery(example)}
                      className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                      disabled={isFormDisabled}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Settings Row */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Max Results: {maxResults}</Label>
                <Slider
                  value={[maxResults]}
                  onValueChange={([value]) => setMaxResults(value)}
                  min={1}
                  max={20}
                  step={1}
                  disabled={isFormDisabled}
                />
              </div>
              <div className="space-y-2">
                <Label>Min Score: {minScore}</Label>
                <Slider
                  value={[minScore]}
                  onValueChange={([value]) => setMinScore(value)}
                  min={0}
                  max={100}
                  step={5}
                  disabled={isFormDisabled}
                />
              </div>
            </div>

            {/* Advanced Toggle */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full justify-start gap-2 text-muted-foreground"
            >
              <Settings2 className="h-4 w-4" />
              {showAdvanced ? "Hide" : "Show"} Advanced Options
            </Button>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Skip Enrichment</Label>
                    <p className="text-sm text-muted-foreground">
                      Faster scraping, less contact data
                    </p>
                  </div>
                  <Switch
                    checked={skipEnrichment}
                    onCheckedChange={setSkipEnrichment}
                    disabled={isFormDisabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Skip Outreach</Label>
                    <p className="text-sm text-muted-foreground">
                      No AI-generated messages
                    </p>
                  </div>
                  <Switch
                    checked={skipOutreach}
                    onCheckedChange={setSkipOutreach}
                    disabled={isFormDisabled}
                  />
                </div>

                {!skipOutreach && (
                  <div className="space-y-2">
                    <Label htmlFor="productContext">Product Context</Label>
                    <Textarea
                      id="productContext"
                      placeholder="Describe your product/service for personalized outreach messages..."
                      value={productContext}
                      onChange={(e) => setProductContext(e.target.value)}
                      disabled={isFormDisabled}
                      rows={3}
                      maxLength={MAX_PRODUCT_CONTEXT_CHARS + 100}
                      className={isOverCharLimit ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    <div className="flex items-center justify-between">
                      <p className={`text-sm ${isOverCharLimit ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                        {productContextChars}/{MAX_PRODUCT_CONTEXT_CHARS} characters
                      </p>
                      {isOverCharLimit && (
                        <p className="text-sm text-red-500">
                          Please reduce to {MAX_PRODUCT_CONTEXT_CHARS} characters or less
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            {disabledMessage && disabled && (
              <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">
                {disabledMessage}
              </div>
            )}

            {/* Error Messages */}
            {formError && (
              <div
                className={`rounded-lg p-3 text-sm flex items-start gap-2 ${
                  formError.type === "banned"
                    ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                    : "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
                }`}
              >
                {formError.type === "banned" ? (
                  <Ban className="h-4 w-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className="font-medium">
                    {formError.type === "banned" ? "Account Restricted" : "Rate Limited"}
                  </p>
                  <p>{formError.message}</p>
                  {formError.retryAfter && (
                    <p className="mt-1 text-xs opacity-80">
                      Try again in {formError.retryAfter} seconds
                    </p>
                  )}
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isFormDisabled || !query.trim() || isOverCharLimit}
              className="w-full"
              size="lg"
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : isLoading ? (
                <>
                  <Zap className="mr-2 h-4 w-4 animate-pulse" />
                  Scraping...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Start Scraping
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Query Warning Modal */}
      <QueryWarningModal
        isOpen={showWarningModal}
        onClose={handleCloseModal}
        onProceed={handleProceedAnyway}
        onUseSuggestion={handleUseSuggestion}
        message={pendingWarning?.message || null}
        suggestions={pendingWarning?.suggestions || []}
      />

      {/* Duplicate Query Modal */}
      {duplicateCheck && (
        <DuplicateQueryModal
          open={showDuplicateModal}
          onOpenChange={handleCloseDuplicateModal}
          query={query}
          similarJobs={duplicateCheck.similar_jobs}
          suggestions={duplicateCheck.suggestions}
          message={duplicateCheck.message}
          onProceed={handleProceedWithDuplicate}
          onUseSuggestion={handleUseSuggestion}
        />
      )}
    </>
  );
}
