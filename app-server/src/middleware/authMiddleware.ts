import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";

type RoleValue = "admin" | "employe";
type CompanyStatusValue = "active" | "suspended" | "archived";

interface AuthenticatedUserRow {
  id: string;
  name: string;
  email: string;
  role: RoleValue;
  is_active: boolean;
  company_id: string | null;
  company_name: string | null;
  company_status: CompanyStatusValue | null;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: RoleValue;
  companyId: string | null;
  companyName: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

async function getAuthenticatedUserById(id: string) {
  const rows = await prisma.$queryRaw<AuthenticatedUserRow[]>`
    SELECT
      u.id,
      u.name,
      u.email,
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

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.slice("Bearer ".length).trim();

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    const user = await getAuthenticatedUserById(payload.sub);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: "Compte desactive" });
    }

    if (user.company_id && user.company_status !== "active") {
      return res.status(403).json({ message: "Entreprise suspendue ou archivee" });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
      companyName: user.company_name,
    };
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
