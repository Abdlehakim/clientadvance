import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

const OWNER_ADMIN_HEADER = "x-owner-admin-key";

export function ownerAdminKeyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // TODO: replace OWNER_ADMIN_KEY with full owner admin authentication before production.
  const providedKey = req.header(OWNER_ADMIN_HEADER)?.trim();

  if (!providedKey || providedKey !== env.OWNER_ADMIN_KEY) {
    return res.status(403).json({ message: "Forbidden" });
  }

  next();
}
