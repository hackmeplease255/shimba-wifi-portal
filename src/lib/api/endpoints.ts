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
  listPackages: (signal?: AbortSignal) =>
    apiRequest<Package[]>("/api/packages", { signal }),

  // Voucher auth (Tumia Vocha)
  authenticateVoucher: (code: string, signal?: AbortSignal) =>
    apiRequest<VoucherAuthResponse>("/api/auth/voucher", {
      method: "POST",
      body: { code },
      signal,
    }),

  // Payments (Nunua Vocha → Mongike)
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
