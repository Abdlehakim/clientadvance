import bcrypt from "bcrypt";
import { prisma } from "../../config/prisma.js";
import type { AuthenticatedUser } from "../../middleware/authMiddleware.js";
import { createId } from "../../utils/ids.js";
import { HttpError } from "../../utils/httpError.js";
import { createActivityLog } from "../activityLogs/activityLogs.service.js";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "admin" | "employe";
  is_active: boolean;
  company_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: "employe";
}

interface UpdateUserInput {
  name?: string;
  password?: string;
  is_active?: boolean;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function serialize(user: UserRow) {
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

function requireActorCompany(actor: AuthenticatedUser) {
  if (!actor.companyId) {
    throw new HttpError(403, "Compte administrateur non rattache a une entreprise.");
  }

  return actor.companyId;
}

async function getUserByEmail(email: string) {
  const rows = await prisma.$queryRaw<UserRow[]>`
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
    WHERE email = ${email}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getEmployeeByIdForCompany(id: string, companyId: string) {
  const rows = await prisma.$queryRaw<UserRow[]>`
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
    WHERE id = ${id}
      AND role = 'employe'::"Role"
      AND company_id = ${companyId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function listUsers(actor: AuthenticatedUser) {
  const companyId = requireActorCompany(actor);
  const users = await prisma.$queryRaw<UserRow[]>`
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
    WHERE role = 'employe'::"Role"
      AND company_id = ${companyId}
    ORDER BY created_at DESC
  `;

  return users.map(serialize);
}

export async function getUserById(id: string, actor: AuthenticatedUser) {
  const companyId = requireActorCompany(actor);
  const user = await getEmployeeByIdForCompany(id, companyId);

  if (!user) {
    throw new HttpError(404, "Utilisateur introuvable");
  }

  return serialize(user);
}

export async function createUser(input: CreateUserInput, actor: AuthenticatedUser) {
  const companyId = requireActorCompany(actor);
  const email = normalizeEmail(input.email);
  const existing = await getUserByEmail(email);

  if (existing) {
    throw new HttpError(409, "Un utilisateur avec cet email existe deja");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const now = new Date();
  const id = createId("usr");

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
      ${id},
      ${input.name.trim()},
      ${email},
      ${passwordHash},
      'employe'::"Role",
      TRUE,
      ${companyId},
      ${now},
      ${now}
    )
  `;

  const user = await getEmployeeByIdForCompany(id, companyId);

  if (!user) {
    throw new HttpError(500, "Creation du compte employee impossible.");
  }

  await createActivityLog({
    userId: actor.id,
    userName: actor.name,
    actionType: "employee_create",
    description: `Creation du compte employe ${user.name}`,
    entityType: "user",
    entityId: user.id,
  });

  return serialize(user);
}

export async function updateUser(id: string, input: UpdateUserInput, actor: AuthenticatedUser) {
  const companyId = requireActorCompany(actor);
  const existing = await getEmployeeByIdForCompany(id, companyId);

  if (!existing) {
    throw new HttpError(404, "Utilisateur introuvable");
  }

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  const isActive = input.is_active !== undefined ? input.is_active : existing.is_active;
  const passwordHash =
    input.password !== undefined
      ? await bcrypt.hash(input.password, 10)
      : null;

  await prisma.$executeRaw`
    UPDATE users
    SET name = ${name},
        password_hash = COALESCE(${passwordHash}, password_hash),
        is_active = ${isActive},
        updated_at = NOW()
    WHERE id = ${id}
      AND company_id = ${companyId}
      AND role = 'employe'::"Role"
  `;

  const user = await getEmployeeByIdForCompany(id, companyId);

  if (!user) {
    throw new HttpError(404, "Utilisateur introuvable");
  }

  if (input.is_active !== undefined && input.is_active !== existing.is_active) {
    await createActivityLog({
      userId: actor.id,
      userName: actor.name,
      actionType: "employee_status_update",
      description: `${input.is_active ? "Activation" : "Desactivation"} du compte employe ${user.name}`,
      entityType: "user",
      entityId: user.id,
    });
  }

  if (input.password !== undefined) {
    await createActivityLog({
      userId: actor.id,
      userName: actor.name,
      actionType: "employee_password_reset",
      description: `Reinitialisation du mot de passe du compte employe ${user.name}`,
      entityType: "user",
      entityId: user.id,
    });
  }

  return serialize(user);
}
