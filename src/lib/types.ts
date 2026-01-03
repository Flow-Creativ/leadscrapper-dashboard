// API Types for Lead Scraper

export interface ScrapeRequest {
  query: string;
  max_results?: number;
  min_score?: number;
  skip_enrichment?: boolean;
  skip_outreach?: boolean;
  product_context?: string;
}

export interface JobCreatedResponse {
  job_id: string;
  status: string;
  websocket_url: string;
}

export interface JobProgress {
  step: string;
  current: number;
  total: number;
  message: string;
}

export interface JobSummary {
  total_leads: number;
  hot: number;
  warm: number;
  cold: number;
  duration_seconds: number | null;
}

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  query: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  progress: JobProgress | null;
  summary: JobSummary | null;
  error: string | null;
  // Job configuration for retry
  max_results: number | null;
  min_score: number | null;
  skip_enrichment: boolean | null;
  skip_outreach: boolean | null;
  product_context: string | null;
}

export interface JobListResponse {
  jobs: JobStatusResponse[];
  total: number;
}

export interface OutreachData {
  email_subject: string;
  email_body: string;
  linkedin_message: string;
  whatsapp_message: string;
  cold_call_script: string;
}

export interface Lead {
  name: string;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  website: string | null;
  address: string | null;
  category: string | null;
  rating: number | null;
  review_count: number | null;
  score: number;
  tier: "hot" | "warm" | "cold";
  owner_name: string | null;
  linkedin: string | null;
  facebook: string | null;
  instagram: string | null;
  maps_url: string | null;
  outreach: OutreachData | null;
}

// WebSocket Message Types
export interface WsStatusMessage {
  type: "status";
  step: string;
  current: number;
  total: number;
  message: string;
}

export interface WsLeadMessage {
  type: "lead";
  data: Lead;
}

export interface WsErrorMessage {
  type: "error";
  message: string;
  recoverable: boolean;
}

export interface WsCompleteMessage {
  type: "complete";
  summary: JobSummary;
}

export interface WsPingMessage {
  type: "ping";
}

export type WsMessage =
  | WsStatusMessage
  | WsLeadMessage
  | WsErrorMessage
  | WsCompleteMessage
  | WsPingMessage;
