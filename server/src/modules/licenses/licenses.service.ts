import { createHash } from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../utils/httpError.js";

interface ActivateLicenseInput {
  license_key: string;
  customer_name?: string;
  app_version?: string;
}

interface LicenseRow {
  id: string;
  license_key_hash: string;
  customer_name: string | null;
  status: "active" | "expired" | "revoked" | "suspended";
  expires_at: Date | null;
}

function normalizeLicenseKey(value: string) {
  return value.trim().toUpperCase();
}

function normalizeOptionalText(value: string | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function hashLicenseKey(value: string) {
  return createHash("sha256").update(normalizeLicenseKey(value)).digest("hex");
}

async function getLicenseByHash(licenseKeyHash: string) {
  const rows = await prisma.$queryRaw<LicenseRow[]>`
    SELECT
      id,
      license_key_hash,
      customer_name,
      status::text AS status,
      expires_at
    FROM licenses
    WHERE license_key_hash = ${licenseKeyHash}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function markLicenseExpired(id: string) {
  await prisma.$executeRaw`
    UPDATE licenses
    SET status = 'expired'::"LicenseStatus",
        updated_at = NOW()
    WHERE id = ${id}
  `;
}

async function updateLicenseCustomerName(id: string, customerName: string) {
  await prisma.$executeRaw`
    UPDATE licenses
    SET customer_name = ${customerName},
        updated_at = NOW()
    WHERE id = ${id}
  `;
}

function isExpired(expiresAt: Date | null) {
  return expiresAt instanceof Date && expiresAt.getTime() <= Date.now();
}

function buildLicenseToken(payload: {
  id: string;
  customerName: string | null;
  expiresAt: string | null;
  appVersion: string | null;
}) {
  // Phase 1 keeps local activation simple. Production should verify an
  // asymmetrically signed license token with a bundled public key.
  return jwt.sign(
    {
      typ: "license",
      licenseId: payload.id,
      customerName: payload.customerName,
      expiresAt: payload.expiresAt,
      appVersion: payload.appVersion,
      status: "active",
    },
    env.JWT_SECRET,
  );
}

export async function activateLicense(input: ActivateLicenseInput) {
  const normalizedCustomerName = normalizeOptionalText(input.customer_name);
  const normalizedAppVersion = normalizeOptionalText(input.app_version);
  const license = await getLicenseByHash(hashLicenseKey(input.license_key));

  if (!license) {
    throw new HttpError(404, "Licence invalide.", { status: "invalid" });
  }

  if (license.status === "revoked" || license.status === "suspended") {
    throw new HttpError(403, "Licence invalide.", { status: "invalid" });
  }

  if (license.status === "expired" || isExpired(license.expires_at)) {
    if (license.status !== "expired") {
      await markLicenseExpired(license.id);
    }

    throw new HttpError(403, "Licence expirée.", { status: "expired" });
  }

  const effectiveCustomerName = license.customer_name ?? normalizedCustomerName;

  if (normalizedCustomerName && normalizedCustomerName !== license.customer_name) {
    await updateLicenseCustomerName(license.id, normalizedCustomerName);
  }

  const expiresAtIso = license.expires_at ? license.expires_at.toISOString() : null;

  return {
    license_token: buildLicenseToken({
      id: license.id,
      customerName: effectiveCustomerName,
      expiresAt: expiresAtIso,
      appVersion: normalizedAppVersion,
    }),
    customer_name: effectiveCustomerName,
    expires_at: expiresAtIso,
    status: "active" as const,
  };
}
