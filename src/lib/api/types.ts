// Domain types shared between the frontend and the Debian 12 backend REST API.
// Keep this file the single source of truth for API contracts.

export type PackageId = string;

export interface Package {
  id: PackageId;
  name: string;
  label: string;        // e.g. "Masaa 24"
  price: number;    // e.g. 1000
  duration_days: number;
}

export interface Voucher {
  code: string;
  package: Package;
  expires_at: string;   // ISO
  status: "active" | "used" | "expired";
}

export interface HotspotSession {
  id: string;
  voucher_code: string;
  mac_address: string | null;
  started_at: string;
  expires_at: string;
  bytes_in?: number;
  bytes_out?: number;
}

export type PaymentStatus = "pending" | "processing" | "success" | "failed" | "cancelled";

export interface PaymentRequest {
  package_id: PackageId;
  phone: string;
}

export interface PaymentCreatedResponse {
  payment_id: string;
  status: PaymentStatus;
  message?: string;
}

export interface PaymentStatusResponse {
  payment_id: string;
  status: PaymentStatus;
  voucher?: Voucher;   // present when status === "success"
  message?: string;
}

export interface VoucherAuthResponse {
  session: HotspotSession;
  redirect_url?: string;
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
