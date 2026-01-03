"use client";

import { Fragment, useState } from "react";
import {
  Phone,
  Mail,
  Globe,
  MapPin,
  Star,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageCircle,
  Instagram,
  Facebook,
  Linkedin,
  Search,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TierBadge } from "./tier-badge";
import { trackLeadViewed, trackOutreachCopied, trackContactAction, trackExternalLinkClick } from "@/lib/firebase/analytics";
import { generateLeadResearch } from "@/lib/api";
import type { Lead, JobProgress, LeadResearch } from "@/lib/types";

interface LeadsTableProps {
  leads: Lead[];
  isLoading?: boolean;
  jobStatus?: string; // "pending" | "running" | "completed" | "failed" | "cancelled"
  jobProgress?: JobProgress | null;
}

/**
 * Determine if a lead is still being processed.
 * A lead is processing if job is running and outreach hasn't been generated yet.
 */
function isLeadProcessing(
  lead: Lead,
  jobStatus: string | undefined,
  jobProgress: JobProgress | null | undefined
): boolean {
  // Only show processing state when job is running
  if (jobStatus !== "running") return false;

  // Lead is processing if it doesn't have outreach yet
  // (outreach is the final step, so no outreach = still processing)
  if (!lead.outreach) {
    return true;
  }

  return false;
}

export function LeadsTable({ leads, isLoading, jobStatus, jobProgress }: LeadsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (name: string, lead: Lead) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
      // Track lead viewed when expanding
      trackLeadViewed(lead.name, lead.tier);
    }
    setExpandedRows(newExpanded);
  };

  if (leads.length === 0 && !isLoading) {
    // Show different message based on job status
    const isInterrupted = jobStatus === "failed" || jobStatus === "cancelled";

    return (
      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          {isInterrupted ? (
            <div>
              <h3 className="font-medium">Job was interrupted</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Results couldn&apos;t be saved. Please retry the job.
              </p>
            </div>
          ) : (
            <>
              <div>
                <h3 className="font-medium">No results found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Google Maps didn&apos;t return any businesses for this query.
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 text-left text-sm max-w-md mx-auto">
                <p className="font-medium mb-2">Tips for better results:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Use business categories: &quot;coffee shops&quot;, &quot;restaurants&quot;</li>
                  <li>• Add a location: &quot;in Jakarta&quot;, &quot;near Senopati&quot;</li>
                  <li>• Be specific: &quot;Japanese restaurants in Kemang&quot;</li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Leads ({leads.length})</span>
          {isLoading && (
            <span className="text-sm font-normal text-muted-foreground animate-pulse">
              Loading...
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Click on a row to view outreach messages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Rating</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Tier</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead, index) => (
                <Fragment key={`${lead.name}-${index}`}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleRow(`${lead.name}-${index}`, lead)}
                  >
                    <TableCell>
                      {expandedRows.has(`${lead.name}-${index}`) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {lead.name}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground">
                      {lead.category || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {lead.rating ? (
                        <span className="flex items-center justify-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          {lead.rating.toFixed(1)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {lead.score.toFixed(0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <TierBadge
                        tier={lead.tier}
                        isProcessing={isLeadProcessing(lead, jobStatus, jobProgress)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {lead.phone && (
                          <Phone className="h-4 w-4 text-green-500" />
                        )}
                        {lead.email && (
                          <Mail className="h-4 w-4 text-blue-500" />
                        )}
                        {lead.whatsapp && (
                          <MessageCircle className="h-4 w-4 text-green-600" />
                        )}
                        {lead.instagram && (
                          <Instagram className="h-4 w-4 text-pink-500" />
                        )}
                        {lead.facebook && (
                          <Facebook className="h-4 w-4 text-blue-600" />
                        )}
                        {lead.linkedin && (
                          <Linkedin className="h-4 w-4 text-blue-700" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {lead.website && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(lead.website!, "_blank");
                            }}
                          >
                            <Globe className="h-4 w-4" />
                          </Button>
                        )}
                        {lead.maps_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(lead.maps_url!, "_blank");
                            }}
                          >
                            <MapPin className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(`${lead.name}-${index}`) && (
                    <TableRow>
                      <TableCell colSpan={8} className="bg-muted/30">
                        <LeadDetails lead={lead} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function LeadDetails({ lead }: { lead: Lead }) {
  const [research, setResearch] = useState<LeadResearch | null>(lead.research || null);
  const [isResearching, setIsResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);

  const handleOutreachClick = (channel: string) => {
    trackOutreachCopied(channel, lead.tier);
  };

  const handleResearch = async () => {
    if (!lead.id) return;

    setIsResearching(true);
    setResearchError(null);

    try {
      const result = await generateLeadResearch(lead.id);
      setResearch(result.research);
    } catch {
      setResearchError("Failed to generate research. Please try again.");
    } finally {
      setIsResearching(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Contact Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {lead.phone && (
          <div>
            <span className="text-muted-foreground">Phone:</span>
            <a
              href={`tel:${lead.phone}`}
              className="ml-2 text-blue-500 hover:underline"
              onClick={() => trackContactAction("phone_call", lead.name)}
            >
              {lead.phone}
            </a>
          </div>
        )}
        {lead.email && (
          <div>
            <span className="text-muted-foreground">Email:</span>
            <a
              href={`mailto:${lead.email}`}
              className="ml-2 text-blue-500 hover:underline"
              onClick={() => trackContactAction("email_click", lead.name)}
            >
              {lead.email}
            </a>
          </div>
        )}
        {lead.whatsapp && (
          <div>
            <span className="text-muted-foreground">WhatsApp:</span>
            <a
              href={`https://wa.me/${lead.whatsapp}${lead.outreach?.whatsapp_message ? `?text=${encodeURIComponent(lead.outreach.whatsapp_message)}` : ""}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-green-500 hover:underline inline-flex items-center gap-1"
              onClick={() => handleOutreachClick("whatsapp")}
            >
              {lead.outreach?.whatsapp_message ? "Send Message" : "Open Chat"} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
        {lead.owner_name && (
          <div>
            <span className="text-muted-foreground">Owner:</span>
            <span className="ml-2">{lead.owner_name}</span>
          </div>
        )}
      </div>

      {/* Address */}
      {lead.address && (
        <div className="text-sm">
          <span className="text-muted-foreground">Address:</span>
          <span className="ml-2">{lead.address}</span>
        </div>
      )}

      {/* Social Media */}
      {(lead.instagram || lead.facebook || lead.linkedin) && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">Social:</span>
          {lead.instagram && (
            <a
              href={lead.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-500 hover:underline inline-flex items-center gap-1"
              onClick={() => trackExternalLinkClick("instagram", lead.instagram!)}
            >
              <Instagram className="h-4 w-4" />
              Instagram
            </a>
          )}
          {lead.facebook && (
            <a
              href={lead.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
              onClick={() => trackExternalLinkClick("facebook", lead.facebook!)}
            >
              <Facebook className="h-4 w-4" />
              Facebook
            </a>
          )}
          {lead.linkedin && (
            <a
              href={lead.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 hover:underline inline-flex items-center gap-1"
              onClick={() => trackExternalLinkClick("linkedin", lead.linkedin!)}
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </a>
          )}
        </div>
      )}

      {/* Research Section */}
      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            Business Research
          </h4>
          {!research && lead.id && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleResearch}
              disabled={isResearching}
            >
              {isResearching ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Researching...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-3 w-3" />
                  Generate Research
                </>
              )}
            </Button>
          )}
        </div>

        {researchError && (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" />
            {researchError}
          </div>
        )}

        {!research && !isResearching && !researchError && lead.id && (
          <p className="text-sm text-muted-foreground">
            Click &quot;Generate Research&quot; to get AI-powered insights about this business.
          </p>
        )}

        {research && (
          <div className="space-y-3 rounded-lg bg-blue-50 dark:bg-blue-950 p-4">
            {/* Overview */}
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-1">Overview</h5>
              <p className="text-sm">{research.overview}</p>
            </div>

            {/* Pain Points */}
            {research.pain_points.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-1">Potential Pain Points</h5>
                <ul className="text-sm space-y-1">
                  {research.pain_points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">&#x2022;</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Opportunities */}
            {research.opportunities.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-1">Why They Might Need You</h5>
                <ul className="text-sm space-y-1">
                  {research.opportunities.map((opp, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">&#x2022;</span>
                      <span>{opp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Talking Points */}
            {research.talking_points.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-1">Conversation Starters</h5>
                <ul className="text-sm space-y-1">
                  {research.talking_points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <MessageCircle className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Outreach Messages */}
      {lead.outreach && (
        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-semibold">Outreach Messages</h4>
          <div className="grid gap-3">
            {lead.outreach.email_subject && (
              <div className="rounded-lg bg-background p-3 border">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Email
                </div>
                <div className="font-medium">{lead.outreach.email_subject}</div>
                <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                  {lead.outreach.email_body}
                </div>
              </div>
            )}
            {lead.outreach.whatsapp_message && (
              <div className="rounded-lg bg-background p-3 border">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    WhatsApp
                  </div>
                  {lead.whatsapp && (
                    <a
                      href={`https://wa.me/${lead.whatsapp}?text=${encodeURIComponent(lead.outreach.whatsapp_message)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-600 hover:underline inline-flex items-center gap-1"
                      onClick={() => handleOutreachClick("whatsapp")}
                    >
                      <MessageCircle className="h-3 w-3" />
                      Send via WhatsApp
                    </a>
                  )}
                </div>
                <div className="text-sm whitespace-pre-wrap">
                  {lead.outreach.whatsapp_message}
                </div>
              </div>
            )}
            {lead.outreach.linkedin_message && (
              <div className="rounded-lg bg-background p-3 border">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  LinkedIn
                </div>
                <div className="text-sm whitespace-pre-wrap">
                  {lead.outreach.linkedin_message}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
