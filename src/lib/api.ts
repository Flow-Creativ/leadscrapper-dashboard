// API Client for Lead Scraper Backend

import { createClient } from "@/lib/supabase/client";
import type {
  ScrapeRequest,
  JobCreatedResponse,
  JobStatusResponse,
  JobListResponse,
  Lead,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

async function getAuthToken(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Get auth token and add to headers
  const token = await getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

export async function startScrape(request: ScrapeRequest): Promise<JobCreatedResponse> {
  return apiFetch<JobCreatedResponse>("/api/scrape", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  return apiFetch<JobStatusResponse>(`/api/jobs/${jobId}`);
}

export async function getJobLeads(jobId: string): Promise<Lead[]> {
  return apiFetch<Lead[]>(`/api/jobs/${jobId}/leads`);
}

export async function listJobs(): Promise<JobListResponse> {
  return apiFetch<JobListResponse>("/api/jobs");
}

export async function cancelJob(jobId: string): Promise<{ message: string; status: string }> {
  return apiFetch<{ message: string; status: string }>(`/api/jobs/${jobId}`, {
    method: "DELETE",
  });
}

export async function deleteJob(jobId: string): Promise<{ message: string; status: string }> {
  return apiFetch<{ message: string; status: string }>(`/api/jobs/${jobId}/delete`, {
    method: "DELETE",
  });
}

export async function exportJobLeads(
  jobId: string,
  format: "csv" | "json" = "csv"
): Promise<Blob> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_URL}/api/jobs/${jobId}/export?format=${format}`,
    { headers }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `Export failed: ${response.status}`);
  }

  return response.blob();
}

export async function bulkExportLeads(
  format: "csv" | "json" = "csv"
): Promise<Blob> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_URL}/api/jobs/export/bulk?format=${format}`,
    { headers }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `Export failed: ${response.status}`);
  }

  return response.blob();
}

export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  return apiFetch<{ status: string; timestamp: string }>("/api/health");
}

export async function getDemoLeads(): Promise<Lead[]> {
  try {
    const response = await fetch(`${API_URL}/api/demo/leads`);
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

export function getWebSocketUrl(jobId: string): string {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
  return `${wsUrl}/ws/${jobId}`;
}

// Export getAuthToken for WebSocket auth
export { getAuthToken };
