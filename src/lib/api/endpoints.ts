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
  // GET /api/v1/packages?router_key= — list active packages for THIS router
  // (multi-router isolation: each portal only sees its own router's packages).
  listPackages: (routerKey?: string, signal?: AbortSignal) =>
    apiRequest<Package[]>("/api/v1/packages" + (routerKey ? `?router_key=${encodeURIComponent(routerKey)}` : ""), { signal }),

  // ── Voucher activation ──
  // POST /api/v1/vouchers/activate — activate a voucher
  // Requires mac_address (from MikroTik redirect params) + optional ip_address
  activateVoucher: (
    code: string,
    macAddress: string,
    ipAddress?: string,
    routerKey?: string,
    signal?: AbortSignal,
  ) =>
    apiRequest<VoucherActivateResponse>("/api/v1/vouchers/activate", {
      method: "POST",
      body: {
        code: code.toUpperCase().trim(),
        mac_address: macAddress.toUpperCase(),
        ip_address: ipAddress || "",
        router_key: routerKey || "",
      },
      signal,
    }),

  // ── Payments (Mongike mobile money) ──
  // POST /api/v1/payments/mongike — initiate a mobile money payment
  // Backend returns: { message, orderReference, mongike }
  createPayment: (payload: PaymentRequest, signal?: AbortSignal) =>
    apiRequest<PaymentCreatedResponse>("/api/v1/payments/mongike", {
      method: "POST",
      body: { phone: payload.phone, package_id: payload.package_id, router_key: payload.router_key || "" },
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

  // ── Support phone ──
  // GET /api/v1/monitoring/support-phone — public admin/support number from the
  // system settings (whatsapp_admin_phone). Portal shows it to customers who
  // run into problems — no auth required.
  getSupportPhone: (signal?: AbortSignal) =>
    apiRequest<{ phone: string }>("/api/v1/monitoring/support-phone", { signal }),

  // ── Router monitoring ──
  // GET /api/v1/monitoring/routers — router status overview
  getRouterStatus: (signal?: AbortSignal) =>
    apiRequest<RouterStatus[]>("/api/v1/monitoring/routers", { signal }),
};

export { ApiError } from "./client";
export type * from "./types";
