// Thin fetch wrapper for the SHIMBA WIFI backend REST API.
// Base URL is configured via VITE_API_BASE_URL and points to the
// self-hosted Debian 12 backend. The frontend never talks to MikroTik
// or PostgreSQL directly — every call goes through this client.
//
// Backend wraps all responses in { success: true, data: ... } envelope.
// This client automatically unwraps it — callers receive the data directly.

import type { ApiEnvelope, ApiErrorShape } from "./types";

const BASE_URL = ((import.meta as any).env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, payload: ApiErrorShape) {
    super(payload.message || payload.code || "Unknown error");
    this.name = "ApiError";
    this.code = payload.code;
    this.status = status;
    this.details = payload.details;
  }
}

function assertBaseUrl(): string {
  if (!BASE_URL) {
    throw new ApiError(0, {
      code: "api_base_url_missing",
      message: "Backend API haijaunganishwa. Wasiliana na msimamizi.",
    });
  }
  return BASE_URL;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/**
 * Perform an API request and unwrap the { success, data, error } envelope.
 *
 * Backend success response: { success: true, data: <T> }
 * Backend error response:   { success: false, error: "message", code: "CODE" }
 * Backend paginated:        { success: true, data: <T[]>, pagination: {...} }
 *
 * @returns The unwrapped `data` value on success.
 * @throws ApiError on HTTP errors or business-logic errors.
 */
export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const base = assertBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: opts.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...opts.headers,
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
      credentials: "include",
    });
  } catch (err) {
    throw new ApiError(0, {
      code: "network_error",
      message: "Imeshindwa kuwasiliana na server. Angalia mtandao wako.",
      details: err instanceof Error ? err.message : String(err),
    });
  }

  const text = await response.text();
  const json = text ? safeJson(text) : undefined;

  if (!response.ok) {
    // Extract error from backend envelope or status text
    const payload: ApiErrorShape =
      json && typeof json === "object" && "error" in (json as any)
        ? {
            code: (json as any).code || `http_${response.status}`,
            message: (json as any).error || response.statusText,
          }
        : {
            code: `http_${response.status}`,
            message: response.statusText || "Request failed",
          };
    throw new ApiError(response.status, payload);
  }

  // Unwrap the { success: true, data: <T> } envelope
  if (json && typeof json === "object" && "success" in (json as any)) {
    const envelope = json as ApiEnvelope<T>;
    if (envelope.success && envelope.data !== undefined) {
      return envelope.data as T;
    }
    if (!envelope.success && envelope.error) {
      throw new ApiError(response.status, {
        code: envelope.code || "BUSINESS_ERROR",
        message: envelope.error,
      });
    }
  }

  // Fallback: return raw JSON or text
  return json as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
