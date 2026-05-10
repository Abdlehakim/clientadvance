import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { prisma } from "../../config/prisma.js";
import { createId } from "../../utils/ids.js";
import { HttpError } from "../../utils/httpError.js";
import { createActivityLog } from "../activityLogs/activityLogs.service.js";
import {
  createLicenseRecord,
  listAdminLicensesForCompany,
} from "../licenses/licenses.service.js";

type CompanyStatusValue = "active" | "suspended" | "archived";
type RoleValue = "admin" | "employe";

interface CompanyRecord {
  id: string;
  name: string;
  contact_email: string;
  contact_phone: string | null;
  notes: string | null;
  status: CompanyStatusValue;
  created_at: Date;
  updated_at: Date;
}

interface CompanyListRow extends CompanyRecord {
  license_count: number | bigint | string;
  admin_count: number | bigint | string;
  primary_admin_name: string | null;
}

interface CompanyAdminUserRow {
  id: string;
  name: string;
  email: string;
  role: RoleValue;
  is_active: boolean;
  company_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface CreateCompanyInput {
  company_name: string;
  contact_email: string;
  contact_phone?: string | null;
  notes?: string | null;
  status: CompanyStatusValue;
}

interface UpdateCompanyInput {
  company_name?: string;
  contact_email?: string;
  contact_phone?: string | null;
  notes?: string | null;
  status?: CompanyStatusValue;
}

interface CreateCompanyAdminLicenseBundleInput {
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
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

function serializeCompany(company: CompanyListRow | CompanyRecord) {
  return {
    id: company.id,
    name: company.name,
    contact_email: company.contact_email,
    contact_phone: company.contact_phone,
    notes: company.notes,
    status: company.status,
    created_at: company.created_at.toISOString(),
    updated_at: company.updated_at.toISOString(),
    license_count: "license_count" in company ? coerceCount(company.license_count) : 0,
    admin_count: "admin_count" in company ? coerceCount(company.admin_count) : 0,
    primary_admin_name: "primary_admin_name" in company ? company.primary_admin_name : null,
  };
}

function serializeAdminUser(user: CompanyAdminUserRow) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
    company_id: user.company_id,
    created_at: user.created_at.toISOString(),
    updated_at: user.updated_at.toISOString(),
  };
}

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  let password = "";

  for (const byte of bytes) {
    password += alphabet[byte % alphabet.length];
  }

  return `GF-${password}`;
}

async function getCompanyById(id: string) {
  const rows = await prisma.$queryRaw<CompanyListRow[]>`
    SELECT
      c.id,
      c.name,
      c.contact_email,
      c.contact_phone,
      c.notes,
      c.status::text AS status,
      c.created_at,
      c.updated_at,
      COALESCE((
        SELECT COUNT(*)::int
        FROM licenses l
        WHERE l.company_id = c.id
      ), 0) AS license_count,
      COALESCE((
        SELECT COUNT(*)::int
        FROM users u
        WHERE u.company_id = c.id
          AND u.role = 'admin'::"Role"
      ), 0) AS admin_count,
      (
        SELECT u.name
        FROM users u
        WHERE u.company_id = c.id
          AND u.role = 'admin'::"Role"
        ORDER BY u.created_at ASC
        LIMIT 1
      ) AS primary_admin_name
    FROM companies c
    WHERE c.id = ${id}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getCompanyAdminUsers(companyId: string) {
  return prisma.$queryRaw<CompanyAdminUserRow[]>`
    SELECT
      id,
      name,
      email,
      role::text AS role,
      is_active,
      company_id,
      created_at,
      updated_at
    FROM users
    WHERE company_id = ${companyId}
      AND role = 'admin'::"Role"
    ORDER BY created_at DESC
  `;
}

async function getUserByEmail(email: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function listAdminCompanies() {
  const companies = await prisma.$queryRaw<CompanyListRow[]>`
    SELECT
      c.id,
      c.name,
      c.contact_email,
      c.contact_phone,
      c.notes,
      c.status::text AS status,
      c.created_at,
      c.updated_at,
      COALESCE((
        SELECT COUNT(*)::int
        FROM licenses l
        WHERE l.company_id = c.id
      ), 0) AS license_count,
      COALESCE((
        SELECT COUNT(*)::int
        FROM users u
        WHERE u.company_id = c.id
          AND u.role = 'admin'::"Role"
      ), 0) AS admin_count,
      (
        SELECT u.name
        FROM users u
        WHERE u.company_id = c.id
          AND u.role = 'admin'::"Role"
        ORDER BY u.created_at ASC
        LIMIT 1
      ) AS primary_admin_name
    FROM companies c
    ORDER BY c.created_at DESC
  `;

  return companies.map(serializeCompany);
}

export async function getAdminCompanyById(id: string) {
  const company = await getCompanyById(id);

  if (!company) {
    throw new HttpError(404, "Entreprise introuvable.");
  }

  const [licenses, admins] = await Promise.all([
    listAdminLicensesForCompany(id),
    getCompanyAdminUsers(id),
  ]);

  return {
    ...serializeCompany(company),
    licenses,
    admins: admins.map(serializeAdminUser),
  };
}

export async function createAdminCompany(input: CreateCompanyInput) {
  const now = new Date();
  const id = createId("company");

  await prisma.$executeRaw`
    INSERT INTO companies (
      id,
      name,
      contact_email,
      contact_phone,
      notes,
      status,
      created_at,
      updated_at
    )
    VALUES (
      ${id},
      ${input.company_name.trim()},
      ${normalizeEmail(input.contact_email)},
      ${normalizeOptionalText(input.contact_phone)},
      ${normalizeOptionalText(input.notes)},
      ${input.status}::"CompanyStatus",
      ${now},
      ${now}
    )
  `;

  const company = await getCompanyById(id);

  if (!company) {
    throw new HttpError(500, "Creation de l'entreprise impossible.");
  }

  return serializeCompany(company);
}

export async function updateAdminCompany(id: string, input: UpdateCompanyInput) {
  const existing = await getCompanyById(id);

  if (!existing) {
    throw new HttpError(404, "Entreprise introuvable.");
  }

  await prisma.$executeRaw`
    UPDATE companies
    SET name = ${input.company_name?.trim() ?? existing.name},
        contact_email = ${input.contact_email ? normalizeEmail(input.contact_email) : existing.contact_email},
        contact_phone = ${
          input.contact_phone !== undefined
            ? normalizeOptionalText(input.contact_phone)
            : existing.contact_phone
        },
        notes = ${
          input.notes !== undefined
            ? normalizeOptionalText(input.notes)
            : existing.notes
        },
        status = ${(input.status ?? existing.status)}::"CompanyStatus",
        updated_at = NOW()
    WHERE id = ${id}
  `;

  return getAdminCompanyById(id);
}

export async function createAdminCompanyLicenseBundle(
  companyId: string,
  input: CreateCompanyAdminLicenseBundleInput,
) {
  const temporaryPassword =
    typeof input.admin_password === "string" && input.admin_password.trim().length > 0
      ? input.admin_password
      : generateTemporaryPassword();

  const adminEmail = normalizeEmail(input.admin_email);

  if (await getUserByEmail(adminEmail)) {
    throw new HttpError(409, "Un utilisateur avec cet email existe deja.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const company = await getCompanyById(companyId);

    if (!company) {
      throw new HttpError(404, "Entreprise introuvable.");
    }

    if (
      input.company_name !== undefined ||
      input.contact_email !== undefined ||
      input.contact_phone !== undefined ||
      input.notes !== undefined
    ) {
      await tx.$executeRaw`
        UPDATE companies
        SET name = ${input.company_name?.trim() ?? company.name},
            contact_email = ${input.contact_email ? normalizeEmail(input.contact_email) : company.contact_email},
            contact_phone = ${
              input.contact_phone !== undefined
                ? normalizeOptionalText(input.contact_phone)
                : company.contact_phone
            },
            notes = ${
              input.notes !== undefined
                ? normalizeOptionalText(input.notes)
                : company.notes
            },
            updated_at = NOW()
        WHERE id = ${companyId}
      `;
    }

    const createdLicense = await createLicenseRecord(tx, {
      company_id: companyId,
      customer_name: input.company_name?.trim() ?? company.name,
      expires_at: input.license_expires_at ?? null,
      max_devices: input.max_devices ?? 1,
      note: input.license_note ?? null,
    });

    const adminId = createId("usr");
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const now = new Date();

    await tx.$executeRaw`
      INSERT INTO users (
        id,
        name,
        email,
        password_hash,
        role,
        is_active,
        company_id,
        created_at,
        updated_at
      )
      VALUES (
        ${adminId},
        ${input.admin_name.trim()},
        ${adminEmail},
        ${passwordHash},
        'admin'::"Role",
        TRUE,
        ${companyId},
        ${now},
        ${now}
      )
    `;

    if (input.force_password_change) {
      // TODO: Persist and enforce first-login password change for company admins.
    }

    return {
      company_name: input.company_name?.trim() ?? company.name,
      license_id: createdLicense.id,
      license_key: createdLicense.license_key,
      license_expires_at: input.license_expires_at ?? null,
      max_devices: input.max_devices ?? 1,
      admin: {
        id: adminId,
        name: input.admin_name.trim(),
        email: adminEmail,
        role: "admin" as const,
        company_id: companyId,
        temporary_password: temporaryPassword,
      },
    };
  });

  await createActivityLog({
    userId: null,
    userName: "owner",
    actionType: "owner_company_bundle_create",
    description: `Creation entreprise/licence/admin pour ${result.company_name}`,
    entityType: "company",
    entityId: companyId,
  });

  const [refreshedCompany, licenses] = await Promise.all([
    getCompanyById(companyId),
    listAdminLicensesForCompany(companyId),
  ]);

  if (!refreshedCompany) {
    throw new HttpError(500, "Entreprise introuvable apres creation.");
  }

  const createdLicenseDetail =
    licenses.find((license) => license.id === result.license_id) ?? null;

  if (!createdLicenseDetail) {
    throw new HttpError(500, "Licence introuvable apres creation.");
  }

  return {
    company: serializeCompany(refreshedCompany),
    license: {
      id: createdLicenseDetail.id,
      license_key: result.license_key,
      status: createdLicenseDetail.status,
      expires_at: createdLicenseDetail.expires_at,
      max_devices: createdLicenseDetail.max_devices,
    },
    admin: result.admin,
  };
}
