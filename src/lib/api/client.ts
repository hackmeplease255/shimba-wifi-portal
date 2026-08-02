// Thin fetch wrapper for the SHIMBA WIFI backend REST API.
// Base URL is configured via VITE_API_BASE_URL and points to the
// self-hosted Debian 12 backend. The frontend never talks to MikroTik
// or PostgreSQL directly — every call goes through this client.
//
// Backend wraps all responses in { success: true, data: ... } envelope.
// This client automatically unwraps it — callers receive the data directly.

import type { ApiEnvelope, ApiErrorShape } from "./types";

const BASE_URL = ((import.meta as any).env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";

// Hard cap on every request so the portal can never sit on a loading screen
// forever (e.g. when the backend is unreachable from a pre-auth hotspot
// client and the connection silently hangs). After this many ms the request
// is aborted and surfaces a meaningful error instead of spinning forever.
export const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Combines the caller's AbortSignal (e.g. React Query cancellation) with a
 * hard timeout so a hung fetch is guaranteed to settle within REQUEST_TIMEOUT_MS.
 */
export function withTimeout(signal?: AbortSignal, ms: number = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  let didTimeout = false;
  const timer = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, ms);
  const onOuterAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onOuterAbort, { once: true });
  }
  return {
    signal: controller.signal,
    didTimeout: () => didTimeout,
    cleanup: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onOuterAbort);
    },
  };
}

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

  const { signal, didTimeout, cleanup } = withTimeout(opts.signal);
  let response: Response;
  let text = "";
  try {
    response = await fetch(url, {
      method: opts.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...opts.headers,
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal,
      credentials: "include",
    });
    // Reading the body is also covered by the timeout, so a server that
    // sends headers but stalls the body can't leave the UI loading forever.
    text = await response.text();
  } catch (err) {
    if (didTimeout()) {
      throw new ApiError(0, {
        code: "timeout",
        message: "Server haikujibu kwa muda mrefu. Angalia mtandao wako na jaribu tena.",
        details: "Request timed out",
      });
    }
    // The caller (e.g. React Query) aborted the request — surface it as a
    // cancellation, not a network error.
    if (opts.signal?.aborted) {
      throw err;
    }
    throw new ApiError(0, {
      code: "network_error",
      message: "Imeshindwa kuwasiliana na server. Angalia mtandao wako.",
      details: err instanceof Error ? err.message : String(err),
    });
  } finally {
    cleanup();
  }

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
