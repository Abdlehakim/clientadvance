import type {
  LicenseActivationResponse,
  LicenseState,
  LicenseStateStatus,
  NormalizedLicenseState,
} from "@/domain/types";
import {
  clearLocalStorageKeys,
  emitChange,
  KEYS,
  read,
  write,
} from "@/infrastructure/local/localStorageDatabase";
import { getDb, type SqliteRow } from "@/infrastructure/local/sqlite/sqliteClient";
import {
  ApiError,
  buildApiUrl,
  getApiPayloadMessage,
} from "@/infrastructure/remote/apiClient";
import { isConnectionOnline } from "@/services/connectionService";
import { initializeStorageDriver, useSQLiteStorage } from "./appServices";

const env = import.meta.env as ImportMetaEnv & {
  VITE_LICENSE_DEV_BYPASS?: string;
  VITE_APP_VERSION?: string;
};
const LICENSE_ROW_ID = "primary";
const LICENSE_DEV_BYPASS_ENABLED = env.VITE_LICENSE_DEV_BYPASS === "true";
const APP_VERSION = env.VITE_APP_VERSION;
const IS_DEV = import.meta.env.DEV;
export const LICENSE_STATE_CHANGE_EVENT = "gcp:license-state-change";

export const LICENSE_REQUIRED_MESSAGE =
  "Activation requise. Veuillez saisir une clé de licence valide.";
export const LICENSE_ACTIVATED_SUCCESS_MESSAGE = "Licence activée avec succès.";
export const LICENSE_ACTIVATION_FAILED_MESSAGE =
  "Activation impossible. Vérifiez votre clé de licence.";
export const LICENSE_INVALID_MESSAGE = "Licence invalide.";
export const LICENSE_EXPIRED_MESSAGE = "Licence expirée.";
export const LICENSE_OFFLINE_ACTIVE_MESSAGE =
  "Mode hors ligne : licence déjà activée.";

export type LicenseAccessStatus =
  | "active"
  | "missing"
  | "invalid"
  | "expired"
  | "dev-bypass";

export interface LicenseAccessSnapshot {
  state: LicenseState | null;
  status: LicenseAccessStatus;
  requiresActivation: boolean;
  message: string;
  offlineActive: boolean;
  isDevBypass: boolean;
}

interface LicenseStateRow extends SqliteRow {
  id: unknown;
  license_key_hash: unknown;
  license_token: unknown;
  license_status: unknown;
  customer_name: unknown;
  activated_at: unknown;
  expires_at: unknown;
  last_checked_at: unknown;
  created_at: unknown;
  updated_at: unknown;
}

interface LicenseActivationInput {
  licenseKey: string;
  customerName?: string;
}

interface ValidationErrorPayload {
  fieldErrors?: Record<string, string[] | undefined>;
  formErrors?: string[];
}

type LicenseStateInput = Partial<Record<string, unknown>>;

function nowIso() {
  return new Date().toISOString();
}

function normalizeLicenseKey(value: string) {
  return value.trim().toUpperCase();
}

function normalizeOptionalString(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getValidationErrorMessage(payload: unknown) {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("errors" in payload) ||
    typeof payload.errors !== "object" ||
    payload.errors === null
  ) {
    return null;
  }

  const errors = payload.errors as ValidationErrorPayload;
  const fieldErrors = errors.fieldErrors ?? {};

  for (const value of Object.values(fieldErrors)) {
    const message = value?.find((entry) => typeof entry === "string" && entry.trim().length > 0);

    if (message) {
      return message.trim();
    }
  }

  const formMessage = errors.formErrors?.find(
    (entry) => typeof entry === "string" && entry.trim().length > 0,
  );

  return formMessage?.trim() ?? null;
}

function getLicenseApiErrorDetails(payload: unknown) {
  const payloadMessage = getApiPayloadMessage(payload);
  const validationMessage = getValidationErrorMessage(payload);

  return validationMessage ?? payloadMessage;
}

function logLicenseActivationDebug(
  message: string,
  details: Record<string, unknown>,
) {
  if (!IS_DEV) {
    return;
  }

  console.info(`[license] ${message}`, details);
}

function logLicenseActivationError(
  message: string,
  details: Record<string, unknown>,
) {
  if (!IS_DEV) {
    return;
  }

  console.error(`[license] ${message}`, details);
}

function emitLicenseStateChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(LICENSE_STATE_CHANGE_EVENT));
}

function fallbackHash(value: string) {
  let hash = 5381;

  for (const character of value) {
    hash = ((hash << 5) + hash) ^ character.charCodeAt(0);
  }

  return `fallback-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

async function hashLicenseKey(value: string) {
  const normalized = normalizeLicenseKey(value);

  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(normalized),
    );

    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  return fallbackHash(normalized);
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function readNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readOptionalTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function readRecordValue(record: LicenseStateInput, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function normalizeTimestamp(value: unknown) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    return null;
  }

  const timestamp = Date.parse(normalized);

  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function normalizeRequiredTimestamp(value: unknown, fallbackValue?: unknown) {
  return normalizeTimestamp(value) ?? normalizeTimestamp(fallbackValue) ?? nowIso();
}

function readLicenseStatus(value: unknown): LicenseStateStatus {
  return value === "active" || value === "expired" || value === "invalid"
    ? value
    : "invalid";
}

function toLicenseState(row: LicenseStateRow | LicenseStateInput): LicenseState {
  const createdAt = normalizeRequiredTimestamp(
    readRecordValue(row, "created_at", "createdAt"),
  );
  const activatedAt = normalizeRequiredTimestamp(
    readRecordValue(row, "activated_at", "activatedAt"),
    createdAt,
  );
  const updatedAt = normalizeRequiredTimestamp(
    readRecordValue(row, "updated_at", "updatedAt"),
    activatedAt,
  );

  return {
    id: readString(readRecordValue(row, "id"), LICENSE_ROW_ID),
    license_key_hash: readString(
      readRecordValue(row, "license_key_hash", "licenseKeyHash"),
    ),
    license_token: readString(readRecordValue(row, "license_token", "licenseToken")),
    license_status: readLicenseStatus(
      readRecordValue(row, "license_status", "licenseStatus"),
    ),
    customer_name: readNullableString(
      readRecordValue(row, "customer_name", "customerName"),
    ),
    activated_at: activatedAt,
    expires_at: normalizeTimestamp(readRecordValue(row, "expires_at", "expiresAt")),
    last_checked_at: normalizeTimestamp(
      readRecordValue(row, "last_checked_at", "lastCheckedAt"),
    ),
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

export function normalizeLicenseState(raw: unknown): NormalizedLicenseState | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const record = raw as LicenseStateInput;
  const licenseToken =
    readOptionalTrimmedString(
      readRecordValue(record, "license_token", "licenseToken"),
    ) ?? "";
  const licenseStatus = readLicenseStatus(
    readRecordValue(record, "license_status", "licenseStatus"),
  );
  const customerName = readOptionalTrimmedString(
    readRecordValue(record, "customer_name", "customerName"),
  );
  const activatedAt = normalizeTimestamp(
    readRecordValue(record, "activated_at", "activatedAt"),
  );
  const expiresAt = normalizeTimestamp(
    readRecordValue(record, "expires_at", "expiresAt"),
  );
  const lastCheckedAt = normalizeTimestamp(
    readRecordValue(record, "last_checked_at", "lastCheckedAt"),
  );
  const licenseKeyMasked = readOptionalTrimmedString(
    readRecordValue(record, "license_key_masked", "licenseKeyMasked"),
  );

  const hasData =
    licenseToken.length > 0 ||
    customerName !== null ||
    activatedAt !== null ||
    expiresAt !== null ||
    lastCheckedAt !== null ||
    licenseKeyMasked !== null ||
    readRecordValue(record, "license_status", "licenseStatus") !== undefined;

  if (!hasData) {
    return null;
  }

  return {
    licenseToken,
    licenseStatus,
    customerName,
    activatedAt,
    expiresAt,
    lastCheckedAt,
    licenseKeyMasked,
  };
}

function isExpiredDate(expiresAt: string | null) {
  if (typeof expiresAt !== "string" || expiresAt.trim().length === 0) {
    return false;
  }

  const timestamp = Date.parse(expiresAt);
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}

function buildBypassState(): LicenseState {
  const timestamp = nowIso();

  return {
    id: LICENSE_ROW_ID,
    license_key_hash: "dev-bypass",
    license_token: "dev-bypass",
    license_status: "active",
    customer_name: "Développement",
    activated_at: timestamp,
    expires_at: null,
    last_checked_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

async function readSqliteLicenseState() {
  const db = await getDb();
  const rows = await db.query<LicenseStateRow>(
    `
      SELECT
        id,
        license_key_hash,
        license_token,
        license_status,
        customer_name,
        activated_at,
        expires_at,
        last_checked_at,
        created_at,
        updated_at
      FROM license_state
      WHERE id = ?
      LIMIT 1
    `,
    [LICENSE_ROW_ID],
  );

  return rows[0] ? toLicenseState(rows[0]) : null;
}

function readLocalStorageLicenseState() {
  const value = read<LicenseState | null>(KEYS.licenseState, null);
  return value ? toLicenseState(value as unknown as LicenseStateInput) : null;
}

async function writeSqliteLicenseState(state: LicenseState) {
  const db = await getDb();
  await db.execute(
    `
      INSERT INTO license_state (
        id,
        license_key_hash,
        license_token,
        license_status,
        customer_name,
        activated_at,
        expires_at,
        last_checked_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        license_key_hash = excluded.license_key_hash,
        license_token = excluded.license_token,
        license_status = excluded.license_status,
        customer_name = excluded.customer_name,
        activated_at = excluded.activated_at,
        expires_at = excluded.expires_at,
        last_checked_at = excluded.last_checked_at,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    `,
    [
      state.id,
      state.license_key_hash,
      state.license_token,
      state.license_status,
      state.customer_name,
      state.activated_at,
      state.expires_at,
      state.last_checked_at,
      state.created_at,
      state.updated_at,
    ],
  );
}

function writeLocalStorageLicenseState(state: LicenseState) {
  write(KEYS.licenseState, state);
}

async function deleteSqliteLicenseState() {
  const db = await getDb();
  await db.execute("DELETE FROM license_state WHERE id = ?", [LICENSE_ROW_ID]);
}

function deleteLocalStorageLicenseState() {
  clearLocalStorageKeys([KEYS.licenseState], { emit: true });
}

export async function getStoredLicenseState() {
  if (LICENSE_DEV_BYPASS_ENABLED) {
    return buildBypassState();
  }

  await initializeStorageDriver();
  return useSQLiteStorage ? readSqliteLicenseState() : readLocalStorageLicenseState();
}

export async function saveLicenseState(state: LicenseState) {
  await initializeStorageDriver();

  if (useSQLiteStorage) {
    await writeSqliteLicenseState(state);
    emitChange();
    emitLicenseStateChange();
    return;
  }

  writeLocalStorageLicenseState(state);
  emitLicenseStateChange();
}

export async function clearLicenseState() {
  await initializeStorageDriver();

  if (useSQLiteStorage) {
    await deleteSqliteLicenseState();
    emitChange();
    emitLicenseStateChange();
    return;
  }

  deleteLocalStorageLicenseState();
  emitLicenseStateChange();
}

export async function getLicenseState() {
  return normalizeLicenseState(await getStoredLicenseState());
}

export function getLicenseAppVersion() {
  return typeof APP_VERSION === "string" && APP_VERSION.trim().length > 0
    ? APP_VERSION.trim()
    : null;
}

export async function refreshLicenseState() {
  if (!LICENSE_DEV_BYPASS_ENABLED) {
    const state = await getStoredLicenseState();

    if (state) {
      const timestamp = nowIso();

      await saveLicenseState({
        ...state,
        last_checked_at: timestamp,
        updated_at: timestamp,
      });
    }
  }

  return getLicenseAccessSnapshot();
}

async function persistFailedActivationState(
  input: LicenseActivationInput,
  status: Extract<LicenseStateStatus, "expired" | "invalid">,
) {
  const existing = await getStoredLicenseState();
  const timestamp = nowIso();
  const licenseKeyHash = await hashLicenseKey(input.licenseKey);

  await saveLicenseState({
    id: LICENSE_ROW_ID,
    license_key_hash: licenseKeyHash,
    license_token: "",
    license_status: status,
    customer_name: normalizeOptionalString(input.customerName),
    activated_at: existing?.activated_at ?? timestamp,
    expires_at: existing?.expires_at ?? null,
    last_checked_at: timestamp,
    created_at: existing?.created_at ?? timestamp,
    updated_at: timestamp,
  });
}

async function createActiveLicenseState(
  input: LicenseActivationInput,
  response: LicenseActivationResponse,
) {
  const existing = await getStoredLicenseState();
  const timestamp = nowIso();

  return {
    id: LICENSE_ROW_ID,
    license_key_hash: await hashLicenseKey(input.licenseKey),
    license_token: response.license_token,
    license_status: "active" as const,
    customer_name: response.customer_name ?? normalizeOptionalString(input.customerName),
    activated_at: timestamp,
    expires_at: normalizeTimestamp(response.expires_at),
    last_checked_at: timestamp,
    created_at: existing?.created_at ?? timestamp,
    updated_at: timestamp,
  };
}

async function requestLicenseActivation(input: LicenseActivationInput) {
  const url = buildApiUrl("licenses/activate");
  const payload = {
    license_key: normalizeLicenseKey(input.licenseKey),
    customer_name: normalizeOptionalString(input.customerName) ?? undefined,
    app_version:
      typeof APP_VERSION === "string" && APP_VERSION.trim().length > 0
        ? APP_VERSION.trim()
        : undefined,
  };

  logLicenseActivationDebug("activation request", {
    url,
    hasCustomerName: typeof payload.customer_name === "string",
    hasAppVersion: typeof payload.app_version === "string",
  });

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : LICENSE_ACTIVATION_FAILED_MESSAGE;

    logLicenseActivationError("activation network error", {
      url,
      message,
    });

    throw new ApiError(0, null, message);
  }

  const rawText = await response.text();
  const responsePayload = rawText ? safeJson(rawText) : null;

  logLicenseActivationDebug("activation response", {
    url,
    status: response.status,
    ok: response.ok,
  });

  if (!response.ok) {
    const message =
      getLicenseApiErrorDetails(responsePayload) ??
      `API ${response.status} sur ${url}`;

    logLicenseActivationError("activation backend error", {
      url,
      status: response.status,
      message,
    });

    throw new ApiError(response.status, responsePayload, message);
  }

  return responsePayload as LicenseActivationResponse;
}

function resolveApiFailureMessage(error: unknown) {
  if (error instanceof ApiError) {
    const details =
      typeof error.payload === "object" && error.payload !== null && "details" in error.payload
        ? error.payload.details
        : null;
    const detailStatus =
      typeof details === "object" && details !== null && "status" in details
        ? details.status
        : null;
    const payloadMessage = getLicenseApiErrorDetails(error.payload) ?? error.message;

    if (detailStatus === "expired") {
      return LICENSE_EXPIRED_MESSAGE;
    }

    if (detailStatus === "invalid" || error.status === 404) {
      return LICENSE_INVALID_MESSAGE;
    }

    if (error.status === 0 && payloadMessage.trim().length > 0) {
      return payloadMessage;
    }

    if (payloadMessage.trim().length > 0) {
      return payloadMessage;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return LICENSE_ACTIVATION_FAILED_MESSAGE;
}

export async function getLicenseAccessSnapshot(): Promise<LicenseAccessSnapshot> {
  if (LICENSE_DEV_BYPASS_ENABLED) {
    return {
      state: buildBypassState(),
      status: "dev-bypass",
      requiresActivation: false,
      message: "",
      offlineActive: false,
      isDevBypass: true,
    };
  }

  const state = await getStoredLicenseState();

  if (!state) {
    return {
      state: null,
      status: "missing",
      requiresActivation: true,
      message: LICENSE_REQUIRED_MESSAGE,
      offlineActive: false,
      isDevBypass: false,
    };
  }

  if (state.license_status === "expired" || isExpiredDate(state.expires_at)) {
    if (state.license_status !== "expired") {
      await saveLicenseState({
        ...state,
        license_status: "expired",
        updated_at: nowIso(),
      });
    }

    return {
      state: { ...state, license_status: "expired" },
      status: "expired",
      requiresActivation: true,
      message: LICENSE_EXPIRED_MESSAGE,
      offlineActive: false,
      isDevBypass: false,
    };
  }

  if (state.license_status !== "active" || state.license_token.trim().length === 0) {
    return {
      state,
      status: "invalid",
      requiresActivation: true,
      message: LICENSE_INVALID_MESSAGE,
      offlineActive: false,
      isDevBypass: false,
    };
  }

  const offlineActive = !isConnectionOnline();

  return {
    state,
    status: "active",
    requiresActivation: false,
    message: offlineActive ? LICENSE_OFFLINE_ACTIVE_MESSAGE : "",
    offlineActive,
    isDevBypass: false,
  };
}

export async function activateLicense(input: LicenseActivationInput) {
  const licenseKey = normalizeLicenseKey(input.licenseKey);

  if (licenseKey.length === 0) {
    throw new Error(LICENSE_REQUIRED_MESSAGE);
  }

  try {
    const response = await requestLicenseActivation({
      ...input,
      licenseKey,
    });
    const nextState = await createActiveLicenseState(input, response);
    await saveLicenseState(nextState);
    return getLicenseAccessSnapshot();
  } catch (error) {
    const message = resolveApiFailureMessage(error);

    if (message === LICENSE_EXPIRED_MESSAGE) {
      await persistFailedActivationState(input, "expired");
    } else if (message === LICENSE_INVALID_MESSAGE) {
      await persistFailedActivationState(input, "invalid");
    }

    throw new Error(message);
  }
}
