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
  Copy,
  Check,
  Clock3,
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
                      <TableCell colSpan={8} className="bg-muted/30 !whitespace-normal align-top">
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
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [expandedBullets, setExpandedBullets] = useState<Record<string, boolean>>({});

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

  const formatGeneratedAt = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.round(diffMs / 60000);
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const handleCopy = async (text: string, key: string) => {
    if (!text || !navigator?.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(key);
      setTimeout(() => setCopiedSection(null), 1200);
    } catch {
      // Fallback: ignore copy errors to avoid blocking UX
    }
  };

  const contextChips = [
    lead.tier ? `${lead.tier.toUpperCase()} tier` : null,
    lead.rating ? `${lead.rating.toFixed(1)} • ${lead.review_count ?? 0} reviews` : null,
    lead.whatsapp ? "Has WhatsApp" : "No WhatsApp",
    lead.website ? "Has website" : "No website",
  ].filter(Boolean) as string[];

  const formatText = (text: string) => {
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (!cleaned) return "";
    const spaced = cleaned.replace(/([.!?])([^\\s])/g, "$1 $2");
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  };

  const researchSections = research
    ? [
        {
          key: "pain_points",
          title: "Pain Points",
          items: research.pain_points.map(formatText),
          accent: "bg-amber-500",
          label: "text-amber-700",
          bullet: "bg-muted-foreground/50",
          icon: <AlertCircle className="h-3.5 w-3.5 text-amber-600" />,
        },
        {
          key: "opportunities",
          title: "Opportunities",
          items: research.opportunities.map(formatText),
          accent: "bg-green-500",
          label: "text-green-700",
          bullet: "bg-muted-foreground/50",
          icon: <Sparkles className="h-3.5 w-3.5 text-green-600" />,
        },
        {
          key: "talking_points",
          title: "Talking Points",
          items: research.talking_points.map(formatText),
          accent: "bg-blue-500",
          label: "text-blue-700",
          bullet: "bg-muted-foreground/50",
          icon: <MessageCircle className="h-3.5 w-3.5 text-blue-600" />,
        },
      ]
    : [];

  const formattedOverview = research ? formatText(research.overview) : "";

  const CollapsibleText = ({ text, sectionKey }: { text: string; sectionKey: string }) => {
    const limit = 220;
    const formatted = formatText(text);
    const shouldClamp = formatted.length > limit;
    const isExpanded = expandedBullets[`${sectionKey}-${formatted}`];
    const displayText = shouldClamp && !isExpanded ? `${formatted.slice(0, limit)}…` : formatted;

    return (
      <div className="space-y-1">
        <span className="whitespace-normal break-words">{displayText}</span>
        {shouldClamp && (
          <button
            type="button"
            className="text-xs font-medium text-blue-600 hover:underline"
            onClick={() =>
              setExpandedBullets((prev) => ({
                ...prev,
                [`${sectionKey}-${formatted}`]: !isExpanded,
              }))
            }
          >
            {isExpanded ? "Read less" : "Read more"}
          </button>
        )}
      </div>
    );
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

      {/* Context chips */}
      {contextChips.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {contextChips.map((chip, index) => (
            <span
              key={`${chip}-${index}`}
              className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      {/* Research Section */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <h4 className="font-semibold leading-none">Business Research</h4>
              {research?.generated_at && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  <span>Generated {formatGeneratedAt(research.generated_at)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {research && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() =>
                  handleCopy(
                    [
                      formattedOverview,
                      ...researchSections.map(
                        (section) =>
                          `${section.title}:\n${section.items.join("\n")}`
                      ),
                    ]
                      .filter(Boolean)
                      .join("\n\n"),
                    "all"
                  )
                }
              >
                {copiedSection === "all" ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Copy brief
              </Button>
            )}
            {lead.id && (
              <Button
                size="sm"
                variant={research ? "secondary" : "outline"}
                className="h-8 px-3 text-xs"
                onClick={handleResearch}
                disabled={isResearching}
              >
                {isResearching ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    {research ? "Refreshing..." : "Researching..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-3 w-3" />
                    {research ? "Regenerate brief" : "Generate research"}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {researchError && (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" />
            {researchError}
          </div>
        )}

        {!research && !isResearching && !researchError && lead.id && (
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              Generate a short brief to tailor your outreach. We&apos;ll capture pain points, opportunities, and talking points in about 30 seconds.
            </p>
          </div>
        )}

        {isResearching && !research && (
          <div className="space-y-3">
            <div className="h-4 w-48 rounded bg-muted animate-pulse" />
            <div className="grid gap-3 md:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-1 rounded-full bg-muted-foreground/30" />
                    <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-full rounded bg-muted animate-pulse" />
                    <div className="h-3 w-11/12 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-10/12 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {research && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-card p-5">
              <p className="text-sm leading-[1.65] max-w-[72ch] text-foreground whitespace-normal break-words">
                {formattedOverview}
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
              {researchSections.map(
                (section) =>
                  section.items.length > 0 && (
                    <div
                      key={section.key}
                      className="relative flex h-full flex-col rounded-lg border border-border/60 bg-muted/50 p-5 shadow-sm"
                    >
                      <div className="flex items-start gap-3 pb-2">
                        <div className={`h-full w-1 rounded-full ${section.accent} self-stretch`} />
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em]">
                            <span className={section.label}>{section.title}</span>
                            {section.icon}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Highlights to use in outreach
                          </p>
                        </div>
                      </div>
                      <ul className="mt-2 space-y-3 text-sm leading-[1.65] text-foreground">
                        {section.items.map((item, i) => (
                          <li key={i} className="flex gap-2">
                            <span className={`mt-2 h-1.5 w-1.5 rounded-full ${section.bullet}`} />
                            <CollapsibleText text={item} sectionKey={section.key} />
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-1 items-end justify-end pt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => handleCopy(section.items.join("\n"), section.key)}
                          title={`Copy ${section.title.toLowerCase()}`}
                        >
                          {copiedSection === section.key ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )
              )}
            </div>
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
