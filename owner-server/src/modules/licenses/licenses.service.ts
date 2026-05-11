import { createHash, randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { createId } from "../../utils/ids.js";
import { HttpError } from "../../utils/httpError.js";

type LicenseStatusValue = "active" | "expired" | "revoked" | "suspended";
type CompanyStatusValue = "active" | "suspended" | "archived";
type ServerModeValue = "with-server" | "without-server";
type NotificationDeliveryModeValue = "backend" | "desktop-email";

interface RawSqlExecutor {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number>;
}

interface ActivateLicenseInput {
  license_key: string;
  device_id: string;
  customer_name?: string;
  app_version?: string;
}

interface CheckLicenseInput {
  license_token: string;
  device_id: string;
  app_version?: string;
}

interface CreateAdminLicenseInput {
  company_id?: string | null;
  customer_name?: string | null;
  expires_at?: string | null;
  note?: string | null;
  max_devices?: number;
}

interface UpdateAdminLicenseInput {
  customer_name?: string | null;
  expires_at?: string | null;
  status?: LicenseStatusValue;
  note?: string | null;
  max_devices?: number;
}

interface CompanyReferenceRecord {
  id: string;
  name: string;
  status: CompanyStatusValue;
  server_mode: ServerModeValue;
  notification_delivery_mode: NotificationDeliveryModeValue;
}

interface LicenseRecord {
  id: string;
  company_id: string | null;
  company_name: string | null;
  company_status: CompanyStatusValue | null;
  server_mode: ServerModeValue;
  notification_delivery_mode: NotificationDeliveryModeValue;
  license_key_hash: string;
  customer_name: string | null;
  status: LicenseStatusValue;
  expires_at: Date | null;
  max_devices: number;
  created_at: Date;
  updated_at: Date;
  revoked_at: Date | null;
  suspended_at: Date | null;
  note: string | null;
}

interface LicenseListRow extends LicenseRecord {
  active_device_count: number | bigint | string;
}

interface LicenseActivationRecord {
  id: string;
  license_id: string;
  device_id: string;
  app_version: string | null;
  activated_at: Date;
  last_checked_at: Date | null;
  deactivated_at: Date | null;
  revoked_at: Date | null;
}

interface LicenseJwtPayload extends jwt.JwtPayload {
  type?: string;
  license_id?: string;
  company_id?: string | null;
  company_name?: string | null;
  customer_name?: string | null;
  device_id?: string;
  expires_at?: string | null;
  issued_at?: string | null;
  app_version?: string | null;
  status?: string | null;
  server_mode?: string | null;
  notification_delivery_mode?: string | null;
}

const LICENSE_KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function normalizeLicenseKey(value: string) {
  return value.trim().toUpperCase();
}

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeDeviceId(value: string) {
  return value.trim().toLowerCase();
}

function hashLicenseKey(value: string) {
  return createHash("sha256").update(normalizeLicenseKey(value)).digest("hex");
}

function isExpired(expiresAt: Date | null) {
  return expiresAt instanceof Date && expiresAt.getTime() <= Date.now();
}

function serializeDate(value: Date | null) {
  return value ? value.toISOString() : null;
}

function coerceCount(value: number | bigint | string) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  return Number.parseInt(value, 10);
}

function parseOptionalDateInput(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    return null;
  }

  const timestamp = Date.parse(normalized);

  if (!Number.isFinite(timestamp)) {
    throw new HttpError(400, "Date d'expiration invalide.");
  }

  return new Date(timestamp);
}

function generateLicenseKey() {
  const bytes = randomBytes(20);
  let randomPart = "";

  for (const byte of bytes) {
    randomPart += LICENSE_KEY_ALPHABET[byte % LICENSE_KEY_ALPHABET.length];
  }

  const groups = randomPart.match(/.{1,4}/g) ?? [randomPart];
  return `GF-${groups.join("-")}`;
}

function buildLicenseToken(payload: {
  id: string;
  companyId: string | null;
  companyName: string | null;
  customerName: string | null;
  deviceId: string;
  expiresAt: string | null;
  issuedAt: string;
  appVersion: string | null;
  serverMode: ServerModeValue;
  notificationDeliveryMode: NotificationDeliveryModeValue;
}) {
  // Production should move to asymmetric token signing so the desktop app can
  // verify signatures locally with a bundled public key.
  return jwt.sign(
    {
      type: "license",
      license_id: payload.id,
      company_id: payload.companyId,
      company_name: payload.companyName,
      customer_name: payload.customerName,
      device_id: payload.deviceId,
      expires_at: payload.expiresAt,
      issued_at: payload.issuedAt,
      app_version: payload.appVersion,
      status: "active",
      server_mode: payload.serverMode,
      notification_delivery_mode: payload.notificationDeliveryMode,
    },
    env.JWT_SECRET,
    {
      expiresIn: "365d",
    },
  );
}

async function syncExpiredLicenses() {
  await prisma.$executeRaw`
    UPDATE licenses
    SET status = 'expired'::"LicenseStatus",
        updated_at = NOW()
    WHERE status = 'active'::"LicenseStatus"
      AND expires_at IS NOT NULL
      AND expires_at <= NOW()
  `;
}

async function getCompanyReferenceById(
  db: RawSqlExecutor,
  companyId: string,
) {
  const rows = await db.$queryRaw<CompanyReferenceRecord[]>`
    SELECT
      id,
      name,
      status::text AS status,
      COALESCE(server_mode, 'without-server') AS server_mode,
      COALESCE(
        notification_delivery_mode,
        CASE
          WHEN COALESCE(server_mode, 'without-server') = 'with-server'
            THEN 'backend'
          ELSE 'desktop-email'
        END
      ) AS notification_delivery_mode
    FROM companies
    WHERE id = ${companyId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getLicenseByHash(
  licenseKeyHash: string,
) {
  const rows = await prisma.$queryRaw<LicenseRecord[]>`
    SELECT
      l.id,
      l.company_id,
      c.name AS company_name,
      c.status::text AS company_status,
      COALESCE(c.server_mode, 'without-server') AS server_mode,
      COALESCE(
        c.notification_delivery_mode,
        CASE
          WHEN COALESCE(c.server_mode, 'without-server') = 'with-server'
            THEN 'backend'
          ELSE 'desktop-email'
        END
      ) AS notification_delivery_mode,
      l.license_key_hash,
      l.customer_name,
      l.status::text AS status,
      l.expires_at,
      l.max_devices,
      l.created_at,
      l.updated_at,
      l.revoked_at,
      l.suspended_at,
      l.note
    FROM licenses l
    LEFT JOIN companies c
      ON c.id = l.company_id
    WHERE l.license_key_hash = ${licenseKeyHash}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getLicenseById(id: string) {
  const rows = await prisma.$queryRaw<LicenseRecord[]>`
    SELECT
      l.id,
      l.company_id,
      c.name AS company_name,
      c.status::text AS company_status,
      COALESCE(c.server_mode, 'without-server') AS server_mode,
      COALESCE(
        c.notification_delivery_mode,
        CASE
          WHEN COALESCE(c.server_mode, 'without-server') = 'with-server'
            THEN 'backend'
          ELSE 'desktop-email'
        END
      ) AS notification_delivery_mode,
      l.license_key_hash,
      l.customer_name,
      l.status::text AS status,
      l.expires_at,
      l.max_devices,
      l.created_at,
      l.updated_at,
      l.revoked_at,
      l.suspended_at,
      l.note
    FROM licenses l
    LEFT JOIN companies c
      ON c.id = l.company_id
    WHERE l.id = ${id}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getActivationByLicenseAndDevice(licenseId: string, deviceId: string) {
  const rows = await prisma.$queryRaw<LicenseActivationRecord[]>`
    SELECT
      id,
      license_id,
      device_id,
      app_version,
      activated_at,
      last_checked_at,
      deactivated_at,
      revoked_at
    FROM license_activations
    WHERE license_id = ${licenseId}
      AND device_id = ${deviceId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getActivationById(licenseId: string, activationId: string) {
  const rows = await prisma.$queryRaw<LicenseActivationRecord[]>`
    SELECT
      id,
      license_id,
      device_id,
      app_version,
      activated_at,
      last_checked_at,
      deactivated_at,
      revoked_at
    FROM license_activations
    WHERE license_id = ${licenseId}
      AND id = ${activationId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getActiveActivationCountExcludingDevice(
  licenseId: string,
  deviceId: string,
) {
  const rows = await prisma.$queryRaw<Array<{ active_count: number | bigint | string }>>`
    SELECT COUNT(*)::int AS active_count
    FROM license_activations
    WHERE license_id = ${licenseId}
      AND deactivated_at IS NULL
      AND revoked_at IS NULL
      AND device_id <> ${deviceId}
  `;

  return coerceCount(rows[0]?.active_count ?? 0);
}

async function markLicenseExpired(id: string) {
  await prisma.$executeRaw`
    UPDATE licenses
    SET status = 'expired'::"LicenseStatus",
        updated_at = NOW()
    WHERE id = ${id}
  `;
}

function getEffectiveLicenseStatus(license: LicenseRecord) {
  if (license.status === "active" && isExpired(license.expires_at)) {
    return "expired" as const;
  }

  if (license.company_id && license.company_status && license.company_status !== "active") {
    return "suspended" as const;
  }

  return license.status;
}

async function loadLicenseByHashOrThrow(licenseKeyHash: string) {
  const license = await getLicenseByHash(licenseKeyHash);

  if (!license) {
    throw new HttpError(404, "Licence invalide.", { status: "invalid" });
  }

  if (license.status === "active" && isExpired(license.expires_at)) {
    await markLicenseExpired(license.id);
    return { ...license, status: "expired" as const };
  }

  return license;
}

async function loadLicenseByIdOrThrow(id: string) {
  const license = await getLicenseById(id);

  if (!license) {
    throw new HttpError(404, "Licence introuvable.");
  }

  if (license.status === "active" && isExpired(license.expires_at)) {
    await markLicenseExpired(license.id);
    return { ...license, status: "expired" as const };
  }

  return license;
}

async function updateLicenseCustomerName(id: string, customerName: string) {
  await prisma.$executeRaw`
    UPDATE licenses
    SET customer_name = ${customerName},
        updated_at = NOW()
    WHERE id = ${id}
  `;
}

async function upsertActivation(input: {
  licenseId: string;
  deviceId: string;
  appVersion: string | null;
  activatedAt: Date;
}) {
  const existing = await getActivationByLicenseAndDevice(input.licenseId, input.deviceId);

  if (existing) {
    await prisma.$executeRaw`
      UPDATE license_activations
      SET app_version = ${input.appVersion},
          activated_at = ${input.activatedAt},
          last_checked_at = ${input.activatedAt},
          deactivated_at = NULL,
          revoked_at = NULL
      WHERE id = ${existing.id}
    `;

    return existing.id;
  }

  const activationId = createId("licact");

  await prisma.$executeRaw`
    INSERT INTO license_activations (
      id,
      license_id,
      device_id,
      app_version,
      activated_at,
      last_checked_at,
      deactivated_at,
      revoked_at
    )
    VALUES (
      ${activationId},
      ${input.licenseId},
      ${input.deviceId},
      ${input.appVersion},
      ${input.activatedAt},
      ${input.activatedAt},
      NULL,
      NULL
    )
  `;

  return activationId;
}

async function recordSuccessfulLicenseCheck(input: {
  licenseId: string;
  deviceId: string;
  appVersion: string | null;
  checkedAt: Date;
  issuedAt: Date;
}) {
  const activation = await getActivationByLicenseAndDevice(input.licenseId, input.deviceId);

  if (activation) {
    await prisma.$executeRaw`
      UPDATE license_activations
      SET app_version = ${input.appVersion ?? activation.app_version},
          last_checked_at = ${input.checkedAt}
      WHERE id = ${activation.id}
    `;

    return;
  }

  await prisma.$executeRaw`
    INSERT INTO license_activations (
      id,
      license_id,
      device_id,
      app_version,
      activated_at,
      last_checked_at,
      deactivated_at,
      revoked_at
    )
    VALUES (
      ${createId("licact")},
      ${input.licenseId},
      ${input.deviceId},
      ${input.appVersion},
      ${input.issuedAt},
      ${input.checkedAt},
      NULL,
      NULL
    )
  `;
}

async function revokeActiveActivations(licenseId: string, revokedAt: Date) {
  await prisma.$executeRaw`
    UPDATE license_activations
    SET revoked_at = ${revokedAt}
    WHERE license_id = ${licenseId}
      AND deactivated_at IS NULL
      AND revoked_at IS NULL
  `;
}

async function serializeAdminLicense(license: LicenseRecord) {
  const rows = await prisma.$queryRaw<Array<{ active_device_count: number | bigint | string }>>`
    SELECT COUNT(*)::int AS active_device_count
    FROM license_activations
    WHERE license_id = ${license.id}
      AND deactivated_at IS NULL
      AND revoked_at IS NULL
  `;

  return {
    id: license.id,
    company_id: license.company_id,
    company_name: license.company_name,
    server_mode: license.server_mode,
    notification_delivery_mode: license.notification_delivery_mode,
    customer_name: license.customer_name,
    status: license.status,
    expires_at: serializeDate(license.expires_at),
    max_devices: license.max_devices,
    created_at: license.created_at.toISOString(),
    updated_at: license.updated_at.toISOString(),
    revoked_at: serializeDate(license.revoked_at),
    suspended_at: serializeDate(license.suspended_at),
    note: license.note,
    active_device_count: coerceCount(rows[0]?.active_device_count ?? 0),
  };
}

function serializeActivation(activation: LicenseActivationRecord) {
  return {
    id: activation.id,
    device_id: activation.device_id,
    app_version: activation.app_version,
    activated_at: activation.activated_at.toISOString(),
    last_checked_at: serializeDate(activation.last_checked_at),
    deactivated_at: serializeDate(activation.deactivated_at),
    revoked_at: serializeDate(activation.revoked_at),
  };
}

async function getAdminLicenseDetail(id: string) {
  const license = await loadLicenseByIdOrThrow(id);
  const activations = await prisma.$queryRaw<LicenseActivationRecord[]>`
    SELECT
      id,
      license_id,
      device_id,
      app_version,
      activated_at,
      last_checked_at,
      deactivated_at,
      revoked_at
    FROM license_activations
    WHERE license_id = ${id}
    ORDER BY activated_at DESC
  `;

  return {
    ...(await serializeAdminLicense(license)),
    activations: activations.map(serializeActivation),
  };
}

async function updateAdminLicenseRecord(
  id: string,
  input: UpdateAdminLicenseInput,
) {
  const current = await loadLicenseByIdOrThrow(id);
  const now = new Date();

  const customerName =
    input.customer_name !== undefined
      ? normalizeOptionalText(input.customer_name)
      : current.customer_name;
  const expiresAt =
    input.expires_at !== undefined
      ? parseOptionalDateInput(input.expires_at) ?? null
      : current.expires_at;
  const maxDevices =
    input.max_devices !== undefined ? input.max_devices : current.max_devices;
  const note =
    input.note !== undefined ? normalizeOptionalText(input.note) : current.note;

  let status = input.status ?? current.status;
  let revokedAt = current.revoked_at;
  let suspendedAt = current.suspended_at;

  if (status === "active") {
    suspendedAt = null;
  }

  if (status === "suspended") {
    suspendedAt = current.suspended_at ?? now;
  }

  if (input.status === "revoked") {
    revokedAt = now;
  }

  if (status === "active" && isExpired(expiresAt)) {
    status = "expired";
  }

  await prisma.$executeRaw`
    UPDATE licenses
    SET customer_name = ${customerName},
        status = ${status}::"LicenseStatus",
        expires_at = ${expiresAt},
        max_devices = ${maxDevices},
        note = ${note},
        revoked_at = ${revokedAt},
        suspended_at = ${suspendedAt},
        updated_at = NOW()
    WHERE id = ${id}
  `;

  if (status === "revoked") {
    await revokeActiveActivations(id, revokedAt ?? now);
  }

  return getAdminLicenseDetail(id);
}

export async function createLicenseRecord(
  db: RawSqlExecutor,
  input: CreateAdminLicenseInput,
) {
  const companyId = normalizeOptionalText(input.company_id);
  const company = companyId ? await getCompanyReferenceById(db, companyId) : null;

  if (companyId && !company) {
    throw new HttpError(404, "Entreprise introuvable.");
  }

  const now = new Date();
  const rawLicenseKey = generateLicenseKey();
  const expiresAt = parseOptionalDateInput(input.expires_at) ?? null;
  const status: LicenseStatusValue = isExpired(expiresAt) ? "expired" : "active";
  const id = createId("lic");
  const customerName = normalizeOptionalText(input.customer_name) ?? company?.name ?? null;

  await db.$executeRaw`
    INSERT INTO licenses (
      id,
      company_id,
      license_key_hash,
      customer_name,
      status,
      expires_at,
      max_devices,
      created_at,
      updated_at,
      revoked_at,
      suspended_at,
      note
    )
    VALUES (
      ${id},
      ${company?.id ?? null},
      ${hashLicenseKey(rawLicenseKey)},
      ${customerName},
      ${status}::"LicenseStatus",
      ${expiresAt},
      ${input.max_devices ?? 1},
      ${now},
      ${now},
      NULL,
      NULL,
      ${normalizeOptionalText(input.note)}
    )
  `;

  return {
    id,
    license_key: rawLicenseKey,
  };
}

async function queryAdminLicenses(companyId?: string) {
  await syncExpiredLicenses();

  if (companyId) {
    const licenses = await prisma.$queryRaw<LicenseListRow[]>`
      SELECT
        l.id,
        l.company_id,
        c.name AS company_name,
        c.status::text AS company_status,
        COALESCE(c.server_mode, 'without-server') AS server_mode,
        COALESCE(
          c.notification_delivery_mode,
          CASE
            WHEN COALESCE(c.server_mode, 'without-server') = 'with-server'
              THEN 'backend'
            ELSE 'desktop-email'
          END
        ) AS notification_delivery_mode,
        l.license_key_hash,
        l.customer_name,
        l.status::text AS status,
        l.expires_at,
        l.max_devices,
        l.created_at,
        l.updated_at,
        l.revoked_at,
        l.suspended_at,
        l.note,
        COALESCE(
          COUNT(a.id) FILTER (
            WHERE a.deactivated_at IS NULL
              AND a.revoked_at IS NULL
          ),
          0
        )::int AS active_device_count
      FROM licenses l
      LEFT JOIN companies c
        ON c.id = l.company_id
      LEFT JOIN license_activations a
        ON a.license_id = l.id
      WHERE l.company_id = ${companyId}
      GROUP BY l.id, c.name, c.status, c.server_mode, c.notification_delivery_mode
      ORDER BY l.created_at DESC
    `;

    return licenses;
  }

  return prisma.$queryRaw<LicenseListRow[]>`
    SELECT
      l.id,
      l.company_id,
      c.name AS company_name,
      c.status::text AS company_status,
      COALESCE(c.server_mode, 'without-server') AS server_mode,
      COALESCE(
        c.notification_delivery_mode,
        CASE
          WHEN COALESCE(c.server_mode, 'without-server') = 'with-server'
            THEN 'backend'
          ELSE 'desktop-email'
        END
      ) AS notification_delivery_mode,
      l.license_key_hash,
      l.customer_name,
      l.status::text AS status,
      l.expires_at,
      l.max_devices,
      l.created_at,
      l.updated_at,
      l.revoked_at,
      l.suspended_at,
      l.note,
      COALESCE(
        COUNT(a.id) FILTER (
          WHERE a.deactivated_at IS NULL
            AND a.revoked_at IS NULL
        ),
        0
      )::int AS active_device_count
    FROM licenses l
    LEFT JOIN companies c
      ON c.id = l.company_id
    LEFT JOIN license_activations a
      ON a.license_id = l.id
    GROUP BY l.id, c.name, c.status, c.server_mode, c.notification_delivery_mode
    ORDER BY l.created_at DESC
  `;
}

export async function listAdminLicensesForCompany(companyId: string) {
  const licenses = await queryAdminLicenses(companyId);

  return licenses.map((license) => ({
    id: license.id,
    company_id: license.company_id,
    company_name: license.company_name,
    server_mode: license.server_mode,
    notification_delivery_mode: license.notification_delivery_mode,
    customer_name: license.customer_name,
    status: license.status,
    expires_at: serializeDate(license.expires_at),
    max_devices: license.max_devices,
    created_at: license.created_at.toISOString(),
    updated_at: license.updated_at.toISOString(),
    revoked_at: serializeDate(license.revoked_at),
    suspended_at: serializeDate(license.suspended_at),
    note: license.note,
    active_device_count: coerceCount(license.active_device_count),
  }));
}

export async function activateLicense(input: ActivateLicenseInput) {
  const normalizedCustomerName = normalizeOptionalText(input.customer_name);
  const normalizedAppVersion = normalizeOptionalText(input.app_version);
  const normalizedDeviceId = normalizeDeviceId(input.device_id);
  const license = await loadLicenseByHashOrThrow(hashLicenseKey(input.license_key));
  const effectiveStatus = getEffectiveLicenseStatus(license);

  if (effectiveStatus === "revoked") {
    throw new HttpError(403, "Licence desactivee. Veuillez contacter le support.", {
      status: "revoked",
    });
  }

  if (effectiveStatus === "suspended") {
    throw new HttpError(403, "Licence suspendue. Veuillez contacter le support.", {
      status: "suspended",
    });
  }

  if (effectiveStatus === "expired") {
    throw new HttpError(403, "Licence expiree.", { status: "expired" });
  }

  const activeOtherDevices = await getActiveActivationCountExcludingDevice(
    license.id,
    normalizedDeviceId,
  );

  if (activeOtherDevices >= license.max_devices) {
    throw new HttpError(
      403,
      "Nombre maximal d'appareils actives atteint pour cette licence.",
      { status: "max_devices_reached" },
    );
  }

  if (normalizedCustomerName && normalizedCustomerName !== license.customer_name) {
    await updateLicenseCustomerName(license.id, normalizedCustomerName);
  }

  const effectiveCustomerName = normalizedCustomerName ?? license.customer_name ?? license.company_name;
  const activatedAt = new Date();

  await upsertActivation({
    licenseId: license.id,
    deviceId: normalizedDeviceId,
    appVersion: normalizedAppVersion,
    activatedAt,
  });

  const expiresAtIso = serializeDate(license.expires_at);
  const issuedAtIso = activatedAt.toISOString();

  return {
    license_token: buildLicenseToken({
      id: license.id,
      companyId: license.company_id,
      companyName: license.company_name,
      customerName: effectiveCustomerName,
      deviceId: normalizedDeviceId,
      expiresAt: expiresAtIso,
      issuedAt: issuedAtIso,
      appVersion: normalizedAppVersion,
      serverMode: license.server_mode,
      notificationDeliveryMode: license.notification_delivery_mode,
    }),
    device_id: normalizedDeviceId,
    company_id: license.company_id,
    company_name: license.company_name,
    server_mode: license.server_mode,
    notification_delivery_mode: license.notification_delivery_mode,
    customer_name: effectiveCustomerName,
    expires_at: expiresAtIso,
    status: "active" as const,
  };
}

export async function checkLicense(input: CheckLicenseInput) {
  let payload: LicenseJwtPayload;

  try {
    const verified = jwt.verify(input.license_token, env.JWT_SECRET);

    if (typeof verified !== "object" || verified === null) {
      throw new Error("Invalid token payload.");
    }

    payload = verified as LicenseJwtPayload;
  } catch {
    throw new HttpError(403, "Licence invalide.", { status: "invalid" });
  }

  if (payload.type !== "license" || typeof payload.license_id !== "string") {
    throw new HttpError(403, "Licence invalide.", { status: "invalid" });
  }

  const tokenDeviceId = normalizeOptionalText(payload.device_id)?.toLowerCase() ?? null;
  const requestDeviceId = normalizeDeviceId(input.device_id);

  if (!tokenDeviceId || tokenDeviceId !== requestDeviceId) {
    throw new HttpError(403, "Licence invalide.", { status: "invalid" });
  }

  const license = await loadLicenseByIdOrThrow(payload.license_id);
  const effectiveStatus = getEffectiveLicenseStatus(license);

  if (effectiveStatus === "revoked") {
    return {
      status: "revoked" as const,
      message: "Licence revoquee.",
    };
  }

  if (effectiveStatus === "suspended") {
    return {
      status: "suspended" as const,
      message: "Licence suspendue.",
    };
  }

  if (effectiveStatus === "expired") {
    return {
      status: "expired" as const,
      message: "Licence expiree.",
    };
  }

  const activation = await getActivationByLicenseAndDevice(license.id, requestDeviceId);

  if (activation?.revoked_at || activation?.deactivated_at) {
    return {
      status: "revoked" as const,
      message: "Licence revoquee.",
    };
  }

  const checkedAt = new Date();
  const issuedAtTimestamp = Date.parse(payload.issued_at ?? "");

  await recordSuccessfulLicenseCheck({
    licenseId: license.id,
    deviceId: requestDeviceId,
    appVersion: normalizeOptionalText(input.app_version) ?? normalizeOptionalText(payload.app_version),
    checkedAt,
    issuedAt: Number.isFinite(issuedAtTimestamp) ? new Date(issuedAtTimestamp) : checkedAt,
  });

  return {
    status: "active" as const,
    company_id: license.company_id,
    company_name: license.company_name,
    server_mode: license.server_mode,
    notification_delivery_mode: license.notification_delivery_mode,
    customer_name: license.customer_name ?? license.company_name,
    expires_at: serializeDate(license.expires_at),
    checked_at: checkedAt.toISOString(),
  };
}

export async function listAdminLicenses() {
  const licenses = await queryAdminLicenses();

  return licenses.map((license) => ({
    id: license.id,
    company_id: license.company_id,
    company_name: license.company_name,
    server_mode: license.server_mode,
    notification_delivery_mode: license.notification_delivery_mode,
    customer_name: license.customer_name,
    status: license.status,
    expires_at: serializeDate(license.expires_at),
    max_devices: license.max_devices,
    created_at: license.created_at.toISOString(),
    updated_at: license.updated_at.toISOString(),
    revoked_at: serializeDate(license.revoked_at),
    suspended_at: serializeDate(license.suspended_at),
    note: license.note,
    active_device_count: coerceCount(license.active_device_count),
  }));
}

export async function getAdminLicenseById(id: string) {
  await syncExpiredLicenses();
  return getAdminLicenseDetail(id);
}

export async function createAdminLicense(input: CreateAdminLicenseInput) {
  const created = await createLicenseRecord(prisma, input);

  return {
    license: await getAdminLicenseDetail(created.id),
    license_key: created.license_key,
  };
}

export async function updateAdminLicense(id: string, input: UpdateAdminLicenseInput) {
  return updateAdminLicenseRecord(id, input);
}

export async function revokeAdminLicense(id: string) {
  return updateAdminLicenseRecord(id, {
    status: "revoked",
  });
}

export async function suspendAdminLicense(id: string) {
  return updateAdminLicenseRecord(id, {
    status: "suspended",
  });
}

export async function reactivateAdminLicense(id: string) {
  return updateAdminLicenseRecord(id, {
    status: "active",
  });
}

export async function deactivateAdminLicenseActivation(
  licenseId: string,
  activationId: string,
) {
  const activation = await getActivationById(licenseId, activationId);

  if (!activation) {
    throw new HttpError(404, "Activation introuvable.");
  }

  await prisma.$executeRaw`
    UPDATE license_activations
    SET deactivated_at = ${new Date()}
    WHERE id = ${activation.id}
  `;

  return getAdminLicenseDetail(licenseId);
}
