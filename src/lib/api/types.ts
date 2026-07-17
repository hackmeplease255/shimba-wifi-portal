// Domain types aligned with the actual backend REST API responses.
// Types match what the backend returns — not speculative contracts.

export type PackageId = number;

export interface Package {
  id: PackageId;
  name: string;
  price: number;
  duration_days: number;
  description?: string;
  status?: string;
}

export interface Voucher {
  code: string;
  package?: Package;
  expires_at?: string;
  status?: "active" | "used" | "expired" | "unused" | "paused";
}

export interface HotspotSession {
  id: string;
  voucher_code: string;
  mac_address: string | null;
  started_at: string;
  expires_at?: string;
  bytes_in?: number;
  bytes_out?: number;
}

// Payment request sent to backend
export interface PaymentRequest {
  package_id: PackageId;
  phone: string;
}

// Response from POST /api/v1/payments/mongike
// Backend returns: { message, orderReference, mongike }
export interface PaymentCreatedResponse {
  message: string;
  orderReference: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mongike?: any;
}

// Response from GET /api/v1/payments/status/:reference
// Backend returns: { paid, status, voucher_code? }
export interface PaymentStatusResponse {
  paid: boolean;
  status: "SUCCESS" | "FAILED" | "PROCESSING" | "CANCELLED";
  voucher_code?: string;
}

// Response from POST /api/v1/vouchers/activate
// Backend returns: { success, message, mac_address, ip_address, expires_at }
export interface VoucherActivateResponse {
  success: boolean;
  message: string;
  mac_address: string;
  ip_address?: string;
  expires_at?: string;
}

export interface RouterStatus {
  online: boolean;
  identity?: string;
  uptime_seconds?: number;
  active_users?: number;
}

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

// Generic backend envelope
export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}
