// Thin fetch wrapper for the SHIMBA WIFI backend REST API.
// Base URL is configured via VITE_API_BASE_URL and points to the
// self-hosted Debian 12 backend. The frontend never talks to MikroTik
// or PostgreSQL directly — every call goes through this client.

import type { ApiErrorShape } from "./types";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, payload: ApiErrorShape) {
    super(payload.message);
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
  const data = text ? safeJson(text) : undefined;

  if (!response.ok) {
    const payload: ApiErrorShape =
      (data && typeof data === "object" && "code" in data && "message" in data)
        ? (data as ApiErrorShape)
        : {
            code: `http_${response.status}`,
            message:
              (data && typeof data === "object" && "message" in data
                ? String((data as { message: unknown }).message)
                : undefined) ?? response.statusText ?? "Request failed",
          };
    throw new ApiError(response.status, payload);
  }

  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
