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
import type { Lead } from "@/lib/types";

interface LeadsTableProps {
  leads: Lead[];
  isLoading?: boolean;
}

export function LeadsTable({ leads, isLoading }: LeadsTableProps) {
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
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
          <CardDescription>
            No leads found yet. Start a scrape to find leads.
          </CardDescription>
        </CardHeader>
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
                      <TierBadge tier={lead.tier} />
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
  const handleOutreachClick = (channel: string) => {
    trackOutreachCopied(channel, lead.tier);
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
