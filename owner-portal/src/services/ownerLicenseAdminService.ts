import type {
  OwnerActivatedDeviceSummary,
  OwnerAdminPasswordResetResponse,
  OwnerAdminSummary,
  LicenseAdminStatus,
  OwnerLicenseActivation,
  OwnerCompanyDetail,
  OwnerCompanyLicenseBundleResponse,
  OwnerCompanyStatus,
  OwnerCompanySummary,
  OwnerLicenseDetail,
  OwnerLicenseSummary,
} from "../types";

const env = import.meta.env as ImportMetaEnv & {
  VITE_API_BASE_URL?: string;
};

const DEFAULT_API_BASE_URL = "http://localhost:4100/api";
const OWNER_ADMIN_KEY_STORAGE_KEY = "gestion_facile_owner_admin_key";

export interface OwnerLicenseUpsertInput {
  company_id?: string | null;
  customer_name?: string | null;
  expires_at?: string | null;
  note?: string | null;
  max_devices?: number;
  status?: LicenseAdminStatus;
}

export interface OwnerCompanyUpsertInput {
  company_name?: string;
  contact_email?: string;
  contact_phone?: string | null;
  notes?: string | null;
  status?: OwnerCompanyStatus;
}

export interface OwnerCompanyBundleCreateInput {
  company_name?: string;
  contact_email?: string;
  contact_phone?: string | null;
  notes?: string | null;
  admin_name: string;
  admin_email: string;
  admin_password?: string;
  force_password_change?: boolean;
  license_expires_at?: string | null;
  license_note?: string | null;
  max_devices?: number;
}

export interface OwnerAdminCreateInput {
  admin_name: string;
  admin_email: string;
  admin_password?: string;
  force_password_change?: boolean;
}

export interface OwnerAdminUpdateInput {
  name?: string;
  email?: string;
  force_password_change?: boolean;
}

export interface OwnerAdminPasswordResetInput {
  password?: string;
  force_password_change?: boolean;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function normalizeOwnerAdminKey(value: string) {
  return value.trim();
}

function getOwnerPortalNetworkErrorMessage() {
  return "Serveur propriétaire indisponible ou CORS bloqué.";
}

function normalizeApiBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function getApiBaseUrl() {
  return normalizeApiBaseUrl(env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL);
}

function buildApiUrl(path: string) {
  const normalizedPath = path.trim();

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  if (normalizedPath.length === 0) {
    return getApiBaseUrl();
  }

  return `${getApiBaseUrl()}/${normalizedPath.replace(/^\/+/, "")}`;
}

function getApiPayloadMessage(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string" &&
    payload.message.trim().length > 0
  ) {
    return payload.message.trim();
  }

  return null;
}

function normalizeArrayPayload<T>(payload: unknown, key: string): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    key in payload &&
    Array.isArray((payload as Record<string, unknown>)[key])
  ) {
    return (payload as Record<string, unknown>)[key] as T[];
  }

  return [];
}

function normalizeObjectPayload<T>(payload: unknown, key: string): T | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  if (key in payload) {
    const nested = (payload as Record<string, unknown>)[key];

    if (typeof nested === "object" && nested !== null) {
      return nested as T;
    }
  }

  return payload as T;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public payload: unknown,
    message: string,
  ) {
    super(message);
  }
}

export function getStoredOwnerAdminKey() {
  if (typeof window === "undefined") {
    return "";
  }

  return normalizeOwnerAdminKey(
    sessionStorage.getItem(OWNER_ADMIN_KEY_STORAGE_KEY) ?? "",
  );
}

export function storeOwnerAdminKey(value: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeOwnerAdminKey(value);

  if (normalized.length === 0) {
    sessionStorage.removeItem(OWNER_ADMIN_KEY_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(OWNER_ADMIN_KEY_STORAGE_KEY, normalized);
}

async function ownerAdminFetch<T>(
  path: string,
  ownerAdminKey: string,
  init: RequestInit = {},
): Promise<T> {
  const normalizedKey = normalizeOwnerAdminKey(ownerAdminKey);

  if (normalizedKey.length === 0) {
    throw new Error("La Clé propriétaire est obligatoire.");
  }

  const headers = new Headers(init.headers);
  headers.set("x-owner-admin-key", normalizedKey);

  if (
    init.body !== undefined &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  const url = buildApiUrl(path);

  try {
    response = await fetch(url, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiError(
      0,
      null,
      getOwnerPortalNetworkErrorMessage(),
    );
  }

  const text = await response.text();
  const payload = text ? safeJson(text) : null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload,
      getApiPayloadMessage(payload) ?? `API ${response.status} sur ${url}`,
    );
  }

  return payload as T;
}

export async function listOwnerCompanies(ownerAdminKey: string) {
  const payload = await ownerAdminFetch<unknown>(
    "admin/companies",
    ownerAdminKey,
  );

  return normalizeArrayPayload<OwnerCompanySummary>(payload, "companies");
}

export async function createOwnerCompany(
  ownerAdminKey: string,
  input: Required<Pick<OwnerCompanyUpsertInput, "company_name" | "contact_email">> &
    OwnerCompanyUpsertInput,
) {
  const payload = await ownerAdminFetch<unknown>("admin/companies", ownerAdminKey, {
    method: "POST",
    body: JSON.stringify(input),
  });

  return normalizeObjectPayload<OwnerCompanySummary>(payload, "company") as OwnerCompanySummary;
}

export async function getOwnerCompany(ownerAdminKey: string, companyId: string) {
  const payload = await ownerAdminFetch<unknown>(
    `admin/companies/${encodeURIComponent(companyId)}`,
    ownerAdminKey,
  );
  const company = normalizeObjectPayload<OwnerCompanyDetail>(payload, "company");

  return {
    ...(company as OwnerCompanyDetail),
    licenses: normalizeArrayPayload<OwnerLicenseSummary>(company?.licenses, "licenses"),
    admins: normalizeArrayPayload<OwnerCompanyDetail["admins"][number]>(
      company?.admins,
      "admins",
    ),
  };
}

export async function updateOwnerCompany(
  ownerAdminKey: string,
  companyId: string,
  input: OwnerCompanyUpsertInput,
) {
  const payload = await ownerAdminFetch<unknown>(
    `admin/companies/${encodeURIComponent(companyId)}`,
    ownerAdminKey,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  const company = normalizeObjectPayload<OwnerCompanyDetail>(payload, "company");

  return {
    ...(company as OwnerCompanyDetail),
    licenses: normalizeArrayPayload<OwnerLicenseSummary>(company?.licenses, "licenses"),
    admins: normalizeArrayPayload<OwnerCompanyDetail["admins"][number]>(
      company?.admins,
      "admins",
    ),
  };
}

export async function createOwnerCompanyAdminLicense(
  ownerAdminKey: string,
  companyId: string,
  input: OwnerCompanyBundleCreateInput,
) {
  return ownerAdminFetch<OwnerCompanyLicenseBundleResponse>(
    `admin/companies/${encodeURIComponent(companyId)}/create-admin-license`,
    ownerAdminKey,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function createOwnerCompanyAdmin(
  ownerAdminKey: string,
  companyId: string,
  input: OwnerAdminCreateInput,
) {
  return ownerAdminFetch<OwnerAdminPasswordResetResponse>(
    `admin/companies/${encodeURIComponent(companyId)}/admins`,
    ownerAdminKey,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function listOwnerAdmins(ownerAdminKey: string) {
  const payload = await ownerAdminFetch<unknown>(
    "admin/users",
    ownerAdminKey,
  );

  return normalizeArrayPayload<OwnerAdminSummary>(payload, "admins");
}

export async function updateOwnerAdmin(
  ownerAdminKey: string,
  adminUserId: string,
  input: OwnerAdminUpdateInput,
) {
  return ownerAdminFetch<OwnerAdminSummary>(
    `admin/users/${encodeURIComponent(adminUserId)}`,
    ownerAdminKey,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export async function resetOwnerAdminPassword(
  ownerAdminKey: string,
  adminUserId: string,
  input: OwnerAdminPasswordResetInput = {},
) {
  return ownerAdminFetch<OwnerAdminPasswordResetResponse>(
    `admin/users/${encodeURIComponent(adminUserId)}/reset-password`,
    ownerAdminKey,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function disableOwnerAdmin(ownerAdminKey: string, adminUserId: string) {
  return ownerAdminFetch<OwnerAdminSummary>(
    `admin/users/${encodeURIComponent(adminUserId)}/disable`,
    ownerAdminKey,
    {
      method: "POST",
    },
  );
}

export async function enableOwnerAdmin(ownerAdminKey: string, adminUserId: string) {
  return ownerAdminFetch<OwnerAdminSummary>(
    `admin/users/${encodeURIComponent(adminUserId)}/enable`,
    ownerAdminKey,
    {
      method: "POST",
    },
  );
}

export async function listOwnerLicenses(ownerAdminKey: string) {
  const payload = await ownerAdminFetch<unknown>(
    "admin/licenses",
    ownerAdminKey,
  );

  return normalizeArrayPayload<OwnerLicenseSummary>(payload, "licenses");
}

export async function getOwnerLicense(ownerAdminKey: string, licenseId: string) {
  const payload = await ownerAdminFetch<unknown>(
    `admin/licenses/${encodeURIComponent(licenseId)}`,
    ownerAdminKey,
  );
  const license = normalizeObjectPayload<OwnerLicenseDetail>(payload, "license");

  return {
    ...(license as OwnerLicenseDetail),
    activations: normalizeArrayPayload<OwnerLicenseActivation>(
      license?.activations,
      "activations",
    ),
  };
}

export async function createOwnerLicense(
  ownerAdminKey: string,
  input: OwnerLicenseUpsertInput,
) {
  return ownerAdminFetch<{ license: OwnerLicenseDetail; license_key: string }>(
    "admin/licenses",
    ownerAdminKey,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function updateOwnerLicense(
  ownerAdminKey: string,
  licenseId: string,
  input: OwnerLicenseUpsertInput,
) {
  return ownerAdminFetch<OwnerLicenseDetail>(
    `admin/licenses/${encodeURIComponent(licenseId)}`,
    ownerAdminKey,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export async function revokeOwnerLicense(ownerAdminKey: string, licenseId: string) {
  return ownerAdminFetch<OwnerLicenseDetail>(
    `admin/licenses/${encodeURIComponent(licenseId)}/revoke`,
    ownerAdminKey,
    {
      method: "POST",
    },
  );
}

export async function suspendOwnerLicense(ownerAdminKey: string, licenseId: string) {
  return ownerAdminFetch<OwnerLicenseDetail>(
    `admin/licenses/${encodeURIComponent(licenseId)}/suspend`,
    ownerAdminKey,
    {
      method: "POST",
    },
  );
}

export async function reactivateOwnerLicense(ownerAdminKey: string, licenseId: string) {
  return ownerAdminFetch<OwnerLicenseDetail>(
    `admin/licenses/${encodeURIComponent(licenseId)}/reactivate`,
    ownerAdminKey,
    {
      method: "POST",
    },
  );
}

export async function deactivateOwnerLicenseDevice(
  ownerAdminKey: string,
  licenseId: string,
  activationId: string,
) {
  return ownerAdminFetch<OwnerLicenseDetail>(
    `admin/licenses/${encodeURIComponent(licenseId)}/activations/${encodeURIComponent(activationId)}/deactivate`,
    ownerAdminKey,
    {
      method: "POST",
    },
  );
}

export async function listOwnerActivatedDevices(ownerAdminKey: string) {
  const licenses = await listOwnerLicenses(ownerAdminKey);
  const details = await Promise.all(
    licenses.map((license) => getOwnerLicense(ownerAdminKey, license.id)),
  );

  const devices: OwnerActivatedDeviceSummary[] = [];

  for (const detail of details) {
    const activations = normalizeArrayPayload<OwnerLicenseActivation>(
      detail.activations,
      "activations",
    );

    for (const activation of activations) {
      devices.push({
        id: activation.id,
        license_id: detail.id,
        company_id: detail.company_id,
        company_name: detail.company_name,
        license_status: detail.status,
        device_id: activation.device_id,
        device_id_short:
          activation.device_id.length > 14
            ? `${activation.device_id.slice(0, 6)}...${activation.device_id.slice(-4)}`
            : activation.device_id,
        app_version: activation.app_version,
        activated_at: activation.activated_at,
        last_checked_at: activation.last_checked_at,
        deactivated_at: activation.deactivated_at,
        revoked_at: activation.revoked_at,
      });
    }
  }

  return devices.sort((left, right) =>
    right.activated_at.localeCompare(left.activated_at),
  );
}
