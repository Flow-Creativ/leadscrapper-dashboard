// API Client for Lead Scraper Backend

import { createClient } from "@/lib/supabase/client";
import type {
  ScrapeRequest,
  JobCreatedResponse,
  JobStatusResponse,
  JobListResponse,
  Lead,
  QueryEnhanceResponse,
  DuplicateCheckResponse,
  LeadResearchResponse,
} from "./types";
import { ApiError } from "./types";

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
    const message = error.detail || `API Error: ${response.status}`;

    // Extract Retry-After header for rate limits
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : null;

    throw new ApiError(message, response.status, retryAfter);
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

export async function resumeJob(jobId: string): Promise<{
  message: string;
  status: string;
  skip_leads: number;
  stream_url: string;
}> {
  return apiFetch<{
    message: string;
    status: string;
    skip_leads: number;
    stream_url: string;
  }>(`/api/jobs/${jobId}/resume`, {
    method: "POST",
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

export async function getStreamUrl(jobId: string): Promise<string> {
  const baseUrl = `${API_URL}/api/jobs/${jobId}/stream`;
  const token = await getAuthToken();
  if (token) {
    return `${baseUrl}?token=${encodeURIComponent(token)}`;
  }
  return baseUrl;
}

export async function enhanceQuery(query: string): Promise<QueryEnhanceResponse> {
  try {
    return await apiFetch<QueryEnhanceResponse>("/api/query/enhance", {
      method: "POST",
      body: JSON.stringify({ query }),
    });
  } catch {
    // Fallback: don't block on error
    return {
      query_type: "good",
      is_problematic: false,
      message: null,
      suggestions: [],
    };
  }
}

export async function checkDuplicateQuery(query: string): Promise<DuplicateCheckResponse> {
  try {
    return await apiFetch<DuplicateCheckResponse>("/api/query/check-duplicate", {
      method: "POST",
      body: JSON.stringify({ query }),
    });
  } catch {
    // Don't block on duplicate check errors - just proceed
    return {
      has_duplicates: false,
      similar_jobs: [],
      suggestions: [],
      message: null,
    };
  }
}

export async function generateLeadResearch(leadId: string): Promise<LeadResearchResponse> {
  return apiFetch<LeadResearchResponse>(`/api/leads/${leadId}/research`, {
    method: "POST",
  });
}

// User Preferences
export async function getUserPreferences(): Promise<{ language: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_preferences')
    .select('language')
    .single();

  if (error) {
    // Return default if no preferences found
    return { language: 'en' };
  }

  return data;
}

export async function updateUserPreferences(preferences: { language: string }): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  await supabase
    .from('user_preferences')
    .upsert({ user_id: user.id, ...preferences })
    .select()
    .single();
}

// Export getAuthToken for SSE auth (cookie fallback)
export { getAuthToken };
