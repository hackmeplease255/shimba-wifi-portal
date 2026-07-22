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
  // Backend returns: { message, orderReference, mongike }
  createPayment: (payload: PaymentRequest, signal?: AbortSignal) =>
    apiRequest<PaymentCreatedResponse>("/api/v1/payments/mongike", {
      method: "POST",
      body: { phone: payload.phone, package_id: payload.package_id },
      signal,
    }),

  // GET /api/v1/payments/status/:reference — poll for payment confirmation
  // Backend returns: { paid, status, voucher_code? }
  getPaymentStatus: (reference: string, signal?: AbortSignal) =>
    apiRequest<PaymentStatusResponse>(`/api/v1/payments/status/${encodeURIComponent(reference)}`, {
      method: "GET",
      signal,
    }),

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
