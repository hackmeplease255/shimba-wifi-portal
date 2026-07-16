// Typed endpoint definitions for the SHIMBA WIFI backend.
// Every backend call in the app goes through this module so
// swapping base URLs, headers, or transport requires zero UI changes.

import { apiRequest } from "./client";
import type {
  HotspotSession,
  Package,
  PaymentCreatedResponse,
  PaymentRequest,
  PaymentStatusResponse,
  RouterStatus,
  VoucherActivateResponse,
} from "./types";

export const api = {
  // Packages
  listPackages: async (signal?: AbortSignal) => {
    const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";
    if (!baseUrl) throw new Error("Backend API haijaunganishwa");
    try {
      const resp = await fetch(baseUrl + "/api/packages", {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
      });
      if (!resp.ok) throw new Error(String(resp.status));
      const json = await resp.json();
      if (json && typeof json === "object" && json.success === true && Array.isArray(json.data)) {
        return json.data;
      }
      return Array.isArray(json) ? json : [];
    } catch (err) {
      throw new Error("Network error: " + (err instanceof Error ? err.message : String(err)));
    }
  },

  // Voucher activation
  activateVoucher: (code: string, macAddress: string, ipAddress?: string, signal?: AbortSignal) =>
    apiRequest<VoucherActivateResponse>("/api/vouchers/activate", {
      method: "POST",
      body: {
        code: code.toUpperCase().trim(),
        mac_address: macAddress.toUpperCase(),
        ip_address: ipAddress || "",
      },
      signal,
    }),

  // Payments (Mongike mobile money)
  createPayment: async (payload: PaymentRequest, signal?: AbortSignal) => {
    const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";
    if (!baseUrl) throw new Error("Backend API haijaunganishwa");
    const resp = await fetch(baseUrl + "/api/payments/mongike", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ phone: payload.phone, package_id: payload.package_id }),
      signal,
    });
    const json = await resp.json();
    if (!resp.ok) {
      throw new Error(json?.error || String(resp.status));
    }
    if (json && typeof json === "object" && json.success === true && json.data) {
      return json.data as PaymentCreatedResponse;
    }
    return json as PaymentCreatedResponse;
  },

  getPaymentStatus: (reference: string, signal?: AbortSignal) =>
    apiRequest<PaymentStatusResponse>(
      `/api/payments/status/${encodeURIComponent(reference)}`,
      { signal },
    ),

  // Session info (admin use, kept for future)
  getSessions: (signal?: AbortSignal) =>
    apiRequest<HotspotSession[]>("/api/v1/sessions", { signal }),

  // Router monitoring
  getRouterStatus: (signal?: AbortSignal) =>
    apiRequest<RouterStatus[]>("/api/v1/monitoring/routers", { signal }),
};

export { ApiError } from "./client";
export type * from "./types";
