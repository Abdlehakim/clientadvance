import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { prisma } from "../../config/prisma.js";
import { createId } from "../../utils/ids.js";
import { HttpError } from "../../utils/httpError.js";
import { createActivityLog } from "../activityLogs/activityLogs.service.js";

interface OwnerAdminUserRow {
  id: string;
  company_id: string | null;
  company_name: string | null;
  name: string;
  email: string;
  role: "admin";
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface CompanyRow {
  id: string;
  name: string;
}

interface CreateOwnerAdminUserInput {
  admin_name: string;
  admin_email: string;
  admin_password?: string;
  force_password_change?: boolean;
}

interface UpdateOwnerAdminUserInput {
  name?: string;
  email?: string;
  force_password_change?: boolean;
}

interface ResetOwnerAdminPasswordInput {
  password?: string | null;
  force_password_change?: boolean;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function serializeOwnerAdminUser(user: OwnerAdminUserRow) {
  return {
    id: user.id,
    company_id: user.company_id,
    company_name: user.company_name,
    name: user.name,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
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

async function getCompanyById(companyId: string) {
  const rows = await prisma.$queryRaw<CompanyRow[]>`
    SELECT
      id,
      name
    FROM companies
    WHERE id = ${companyId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getOwnerAdminUserRowById(id: string) {
  const rows = await prisma.$queryRaw<OwnerAdminUserRow[]>`
    SELECT
      u.id,
      u.company_id,
      c.name AS company_name,
      u.name,
      u.email,
      u.role::text AS role,
      u.is_active,
      u.created_at,
      u.updated_at
    FROM users u
    LEFT JOIN companies c
      ON c.id = u.company_id
    WHERE u.id = ${id}
      AND u.role = 'admin'::"Role"
    LIMIT 1
  `;

  return rows[0] ?? null;
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

export async function listOwnerAdminUsers() {
  const rows = await prisma.$queryRaw<OwnerAdminUserRow[]>`
    SELECT
      u.id,
      u.company_id,
      c.name AS company_name,
      u.name,
      u.email,
      u.role::text AS role,
      u.is_active,
      u.created_at,
      u.updated_at
    FROM users u
    LEFT JOIN companies c
      ON c.id = u.company_id
    WHERE u.role = 'admin'::"Role"
      AND u.company_id IS NOT NULL
    ORDER BY u.created_at DESC
  `;

  return rows.map(serializeOwnerAdminUser);
}

export async function listOwnerAdminUsersByCompany(companyId: string) {
  const company = await getCompanyById(companyId);

  if (!company) {
    throw new HttpError(404, "Entreprise introuvable.");
  }

  const rows = await prisma.$queryRaw<OwnerAdminUserRow[]>`
    SELECT
      u.id,
      u.company_id,
      c.name AS company_name,
      u.name,
      u.email,
      u.role::text AS role,
      u.is_active,
      u.created_at,
      u.updated_at
    FROM users u
    LEFT JOIN companies c
      ON c.id = u.company_id
    WHERE u.company_id = ${companyId}
      AND u.role = 'admin'::"Role"
    ORDER BY u.created_at DESC
  `;

  return rows.map(serializeOwnerAdminUser);
}

export async function createOwnerAdminUser(
  companyId: string,
  input: CreateOwnerAdminUserInput,
) {
  const company = await getCompanyById(companyId);

  if (!company) {
    throw new HttpError(404, "Entreprise introuvable.");
  }

  const email = normalizeEmail(input.admin_email);

  if (await getUserByEmail(email)) {
    throw new HttpError(409, "Un utilisateur avec cet email existe deja.");
  }

  const temporaryPassword =
    typeof input.admin_password === "string" && input.admin_password.trim().length > 0
      ? input.admin_password
      : generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);
  const userId = createId("usr");
  const now = new Date();

  await prisma.$executeRaw`
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
      ${userId},
      ${input.admin_name.trim()},
      ${email},
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

  await createActivityLog({
    userId: null,
    userName: "owner",
    actionType: "owner_admin_create",
    description: `Creation du compte administrateur ${input.admin_name.trim()} pour ${company.name}`,
    entityType: "user",
    entityId: userId,
  });

  const admin = await getOwnerAdminUserRowById(userId);

  if (!admin) {
    throw new HttpError(500, "Compte administrateur introuvable apres creation.");
  }

  return {
    admin: serializeOwnerAdminUser(admin),
    temporary_password: temporaryPassword,
  };
}

export async function updateOwnerAdminUser(id: string, input: UpdateOwnerAdminUserInput) {
  const existing = await getOwnerAdminUserRowById(id);

  if (!existing) {
    throw new HttpError(404, "Administrateur introuvable.");
  }

  const nextEmail = input.email ? normalizeEmail(input.email) : existing.email;

  if (nextEmail !== existing.email) {
    const existingUser = await getUserByEmail(nextEmail);

    if (existingUser && existingUser.id !== id) {
      throw new HttpError(409, "Un utilisateur avec cet email existe deja.");
    }
  }

  await prisma.$executeRaw`
    UPDATE users
    SET name = ${input.name?.trim() ?? existing.name},
        email = ${nextEmail},
        updated_at = NOW()
    WHERE id = ${id}
      AND role = 'admin'::"Role"
  `;

  if (input.force_password_change !== undefined) {
    // TODO: Persist and enforce first-login password change for company admins.
  }

  const admin = await getOwnerAdminUserRowById(id);

  if (!admin) {
    throw new HttpError(404, "Administrateur introuvable.");
  }

  await createActivityLog({
    userId: null,
    userName: "owner",
    actionType: "owner_admin_update",
    description: `Mise a jour du compte administrateur ${admin.name}`,
    entityType: "user",
    entityId: id,
  });

  return serializeOwnerAdminUser(admin);
}

export async function resetOwnerAdminUserPassword(
  id: string,
  input: ResetOwnerAdminPasswordInput,
) {
  const existing = await getOwnerAdminUserRowById(id);

  if (!existing) {
    throw new HttpError(404, "Administrateur introuvable.");
  }

  const temporaryPassword =
    typeof input.password === "string" && input.password.trim().length > 0
      ? input.password
      : generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  await prisma.$executeRaw`
    UPDATE users
    SET password_hash = ${passwordHash},
        updated_at = NOW()
    WHERE id = ${id}
      AND role = 'admin'::"Role"
  `;

  if (input.force_password_change) {
    // TODO: Persist and enforce first-login password change for company admins.
  }

  const admin = await getOwnerAdminUserRowById(id);

  if (!admin) {
    throw new HttpError(404, "Administrateur introuvable.");
  }

  await createActivityLog({
    userId: null,
    userName: "owner",
    actionType: "owner_admin_password_reset",
    description: `Reinitialisation du mot de passe administrateur ${admin.name}`,
    entityType: "user",
    entityId: id,
  });

  return {
    admin: serializeOwnerAdminUser(admin),
    temporary_password: temporaryPassword,
  };
}

async function setOwnerAdminUserActiveState(id: string, isActive: boolean) {
  const existing = await getOwnerAdminUserRowById(id);

  if (!existing) {
    throw new HttpError(404, "Administrateur introuvable.");
  }

  await prisma.$executeRaw`
    UPDATE users
    SET is_active = ${isActive},
        updated_at = NOW()
    WHERE id = ${id}
      AND role = 'admin'::"Role"
  `;

  const admin = await getOwnerAdminUserRowById(id);

  if (!admin) {
    throw new HttpError(404, "Administrateur introuvable.");
  }

  await createActivityLog({
    userId: null,
    userName: "owner",
    actionType: isActive ? "owner_admin_enable" : "owner_admin_disable",
    description: `${isActive ? "Activation" : "Desactivation"} du compte administrateur ${admin.name}`,
    entityType: "user",
    entityId: id,
  });

  return serializeOwnerAdminUser(admin);
}

export async function disableOwnerAdminUser(id: string) {
  return setOwnerAdminUserActiveState(id, false);
}

export async function enableOwnerAdminUser(id: string) {
  return setOwnerAdminUserActiveState(id, true);
}
