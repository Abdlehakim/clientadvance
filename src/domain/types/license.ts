export type LicenseStateStatus = "active" | "expired" | "invalid";

export interface LicenseState {
  id: string;
  license_key_hash: string;
  license_token: string;
  license_status: LicenseStateStatus;
  customer_name: string | null;
  activated_at: string;
  expires_at: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LicenseActivationResponse {
  license_token: string;
  customer_name: string | null;
  expires_at: string | null;
  status: "active";
}
