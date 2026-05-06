import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../utils/httpError.js";

function serialize(user: { id: string; name: string; email: string; role: "admin" | "employe"; createdAt: Date }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.createdAt.toISOString(),
  };
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return users.map(serialize);
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  if (!user) {
    throw new HttpError(404, "Utilisateur introuvable");
  }

  return serialize(user);
}
