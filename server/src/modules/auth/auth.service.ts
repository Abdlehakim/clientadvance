import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../utils/httpError.js";
import { createActivityLog } from "../activityLogs/activityLogs.service.js";

function toSafeUser(user: { id: string; name: string; email: string; role: "admin" | "employe" }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new HttpError(401, "Email ou mot de passe invalide");
  }

  if (!user.isActive) {
    throw new HttpError(403, "Compte désactivé");
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

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
  const token = jwt.sign({ role: user.role, email: user.email }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });

  return { token, user: safeUser };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    throw new HttpError(404, "Utilisateur introuvable");
  }

  return toSafeUser(user);
}

export async function logout() {
  return { success: true };
}
