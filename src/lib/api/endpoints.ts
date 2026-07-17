// Typed endpoint definitions for the SHIMBA WIFI backend REST API.
// Every backend call in the app goes through this module so
// swapping base URLs, headers, or transport requires zero UI changes.
//
// All endpoints use the /api/v1/* prefix (versioned API).
// The client automatically unwraps the { success: true, data: ... } envelope.

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
  // ── Packages ──
  // GET /api/v1/packages — list active packages
  listPackages: (signal?: AbortSignal) =>
    apiRequest<Package[]>("/api/v1/packages", { signal }),

  // ── Voucher activation ──
  // POST /api/v1/vouchers/activate — activate a voucher
  // Requires mac_address (from MikroTik redirect params) + optional ip_address
  activateVoucher: (
    code: string,
    macAddress: string,
    ipAddress?: string,
    signal?: AbortSignal,
  ) =>
    apiRequest<VoucherActivateResponse>("/api/v1/vouchers/activate", {
      method: "POST",
      body: {
        code: code.toUpperCase().trim(),
        mac_address: macAddress.toUpperCase(),
        ip_address: ipAddress || "",
      },
      signal,
    }),

  // ── Payments (Mongike mobile money) ──
  // POST /api/v1/payments/mongike — initiate a mobile money payment
  // Backend returns: { success: true, data: { message, orderReference, mongike } }
  createPayment: async (payload: PaymentRequest, signal?: AbortSignal) => {
    const baseUrl = ((import.meta as any).env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";
    if (!baseUrl) throw new Error("Backend API haijaunganishwa");
    const resp = await fetch(baseUrl + "/api/v1/payments/mongike", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ phone: payload.phone, package_id: payload.package_id }),
      signal,
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.error || json?.message || "Payment failed");
    // Unwrap { success: true, data: { ... } } envelope
    if (json?.success && json?.data) return json.data as PaymentCreatedResponse;
    throw new Error("Invalid server response");
  },

  // GET /api/v1/payments/status/:reference — poll for payment confirmation
  // Backend returns: { success: true, data: { paid, status, voucher_code? } }
  getPaymentStatus: async (reference: string, signal?: AbortSignal) => {
    const baseUrl = ((import.meta as any).env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";
    if (!baseUrl) throw new Error("Backend API haijaunganishwa");
    const resp = await fetch(baseUrl + `/api/v1/payments/status/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.error || json?.message || "Status check failed");
    // Unwrap { success: true, data: { ... } } envelope
    if (json?.success && json?.data) return json.data as PaymentStatusResponse;
    throw new Error("Invalid server response");
  },

  // ── Session info ──
  // GET /api/v1/sessions — active sessions
  getSessions: (signal?: AbortSignal) =>
    apiRequest<HotspotSession[]>("/api/v1/sessions", { signal }),

  // ── Router monitoring ──
  // GET /api/v1/monitoring/routers — router status overview
  getRouterStatus: (signal?: AbortSignal) =>
    apiRequest<RouterStatus[]>("/api/v1/monitoring/routers", { signal }),
};

export { ApiError } from "./client";
export type * from "./types";
