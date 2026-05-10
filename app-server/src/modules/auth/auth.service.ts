import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../utils/httpError.js";
import { createActivityLog } from "../activityLogs/activityLogs.service.js";

type RoleValue = "admin" | "employe";
type CompanyStatusValue = "active" | "suspended" | "archived";

interface AuthUserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: RoleValue;
  is_active: boolean;
  company_id: string | null;
  company_name: string | null;
  company_status: CompanyStatusValue | null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toSafeUser(user: Pick<AuthUserRow, "id" | "name" | "email" | "role" | "company_id" | "company_name">) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company_id: user.company_id,
    company_name: user.company_name,
  };
}

async function getAuthUserByEmail(email: string) {
  const rows = await prisma.$queryRaw<AuthUserRow[]>`
    SELECT
      u.id,
      u.name,
      u.email,
      u.password_hash,
      u.role::text AS role,
      u.is_active,
      u.company_id,
      c.name AS company_name,
      c.status::text AS company_status
    FROM users u
    LEFT JOIN companies c
      ON c.id = u.company_id
    WHERE u.email = ${email}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getAuthUserById(id: string) {
  const rows = await prisma.$queryRaw<AuthUserRow[]>`
    SELECT
      u.id,
      u.name,
      u.email,
      u.password_hash,
      u.role::text AS role,
      u.is_active,
      u.company_id,
      c.name AS company_name,
      c.status::text AS company_status
    FROM users u
    LEFT JOIN companies c
      ON c.id = u.company_id
    WHERE u.id = ${id}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

function assertUserCanAuthenticate(user: AuthUserRow | null) {
  if (!user) {
    throw new HttpError(401, "Email ou mot de passe invalide");
  }

  if (!user.is_active) {
    throw new HttpError(403, "Compte desactive");
  }

  if (user.company_id && user.company_status !== "active") {
    throw new HttpError(403, "Entreprise suspendue ou archivee");
  }

  return user;
}

export async function login(email: string, password: string) {
  const user = assertUserCanAuthenticate(
    await getAuthUserByEmail(normalizeEmail(email)),
  );

  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    throw new HttpError(401, "Email ou mot de passe invalide");
  }

  await createActivityLog({
    userId: user.id,
    userName: user.name,
    actionType: "login",
    description: `Connexion de ${user.name}`,
    entityType: "user",
    entityId: user.id,
  });

  const safeUser = toSafeUser(user);
  const token = jwt.sign(
    {
      role: user.role,
      email: user.email,
      company_id: user.company_id,
    },
    env.JWT_SECRET,
    {
      subject: user.id,
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    },
  );

  return { token, user: safeUser };
}

export async function getCurrentUser(userId: string) {
  const user = assertUserCanAuthenticate(await getAuthUserById(userId));
  return toSafeUser(user);
}

export async function logout() {
  return { success: true };
}
