import bcrypt from "bcrypt";
import { prisma } from "../../config/prisma.js";
import type { AuthenticatedUser } from "../../middleware/authMiddleware.js";
import { HttpError } from "../../utils/httpError.js";
import { createActivityLog } from "../activityLogs/activityLogs.service.js";

interface SerializableUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "employe";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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

function serialize(user: SerializableUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    is_active: user.isActive,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    where: { role: "employe" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return users.map(serialize);
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user || user.role !== "employe") {
    throw new HttpError(404, "Utilisateur introuvable");
  }

  return serialize(user);
}

export async function createUser(input: CreateUserInput, actor: AuthenticatedUser) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    throw new HttpError(409, "Un utilisateur avec cet email existe déjà");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      passwordHash,
      role: "employe",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await createActivityLog({
    userId: actor.id,
    userName: actor.name,
    actionType: "employee_create",
    description: `Création du compte employé ${user.name}`,
    entityType: "user",
    entityId: user.id,
  });

  return serialize(user);
}

export async function updateUser(id: string, input: UpdateUserInput, actor: AuthenticatedUser) {
  const existing = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!existing || existing.role !== "employe") {
    throw new HttpError(404, "Utilisateur introuvable");
  }

  const data: {
    name?: string;
    passwordHash?: string;
    isActive?: boolean;
  } = {};

  if (input.name !== undefined) {
    data.name = input.name.trim();
  }

  if (input.password !== undefined) {
    data.passwordHash = await bcrypt.hash(input.password, 10);
  }

  if (input.is_active !== undefined) {
    data.isActive = input.is_active;
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (input.is_active !== undefined && input.is_active !== existing.isActive) {
    await createActivityLog({
      userId: actor.id,
      userName: actor.name,
      actionType: "employee_status_update",
      description: `${input.is_active ? "Activation" : "Désactivation"} du compte employé ${user.name}`,
      entityType: "user",
      entityId: user.id,
    });
  }

  if (input.password !== undefined) {
    await createActivityLog({
      userId: actor.id,
      userName: actor.name,
      actionType: "employee_password_reset",
      description: `Réinitialisation du mot de passe du compte employé ${user.name}`,
      entityType: "user",
      entityId: user.id,
    });
  }

  return serialize(user);
}
