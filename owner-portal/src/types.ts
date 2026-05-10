export type LicenseAdminStatus = "active" | "expired" | "revoked" | "suspended";

export type OwnerCompanyStatus = "active" | "suspended" | "archived";

export interface OwnerLicenseSummary {
  id: string;
  company_id: string | null;
  company_name: string | null;
  customer_name: string | null;
  status: LicenseAdminStatus;
  expires_at: string | null;
  max_devices: number;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
  suspended_at: string | null;
  note: string | null;
  active_device_count: number;
}

export interface OwnerLicenseActivation {
  id: string;
  device_id: string;
  app_version: string | null;
  activated_at: string;
  last_checked_at: string | null;
  deactivated_at: string | null;
  revoked_at: string | null;
}

export interface OwnerLicenseDetail extends OwnerLicenseSummary {
  activations: OwnerLicenseActivation[];
}

export interface OwnerCompanySummary {
  id: string;
  name: string;
  contact_email: string;
  contact_phone: string | null;
  notes: string | null;
  status: OwnerCompanyStatus;
  created_at: string;
  updated_at: string;
  license_count: number;
  admin_count: number;
  primary_admin_name: string | null;
}

export interface OwnerCompanyAdminSummary {
  id: string;
  name: string;
  email: string;
  role: "admin" | "employe";
  is_active: boolean;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OwnerCompanyDetail extends OwnerCompanySummary {
  licenses: OwnerLicenseSummary[];
  admins: OwnerCompanyAdminSummary[];
}

export interface OwnerCompanyLicenseBundleResponse {
  company: OwnerCompanySummary;
  license: {
    id: string;
    license_key: string;
    status: LicenseAdminStatus;
    expires_at: string | null;
    max_devices: number;
  };
  admin: {
    id: string;
    name: string;
    email: string;
    role: "admin";
    company_id: string;
    temporary_password: string;
  };
}

export interface OwnerAdminSummary {
  id: string;
  company_id: string | null;
  company_name: string | null;
  name: string;
  email: string;
  role: "admin";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OwnerAdminPasswordResetResponse {
  admin: OwnerAdminSummary;
  temporary_password: string;
}

export interface OwnerActivatedDeviceSummary {
  id: string;
  license_id: string;
  company_id: string | null;
  company_name: string | null;
  license_status: LicenseAdminStatus;
  device_id: string;
  device_id_short: string;
  app_version: string | null;
  activated_at: string;
  last_checked_at: string | null;
  deactivated_at: string | null;
  revoked_at: string | null;
}
