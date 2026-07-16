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
  VoucherAuthResponse,
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

  // Voucher auth (Tumia Vocha)
  authenticateVoucher: (code: string, signal?: AbortSignal) =>
    apiRequest<VoucherAuthResponse>("/api/auth/voucher", {
      method: "POST",
      body: { code },
      signal,
    }),

  // Payments (Nunua Vocha to Mongike)
  createPayment: (payload: PaymentRequest, signal?: AbortSignal) =>
    apiRequest<PaymentCreatedResponse>("/api/payments/create", {
      method: "POST",
      body: payload,
      signal,
    }),

  getPaymentStatus: (paymentId: string, signal?: AbortSignal) =>
    apiRequest<PaymentStatusResponse>(`/api/payments/${encodeURIComponent(paymentId)}`, {
      signal,
    }),

  // Session / profile (used by admin + customer portal later)
  getSession: (signal?: AbortSignal) =>
    apiRequest<HotspotSession | null>("/api/session", { signal }),

  getRouterStatus: (signal?: AbortSignal) =>
    apiRequest<RouterStatus>("/api/router/status", { signal }),
};

export { ApiError } from "./client";
export type * from "./types";
