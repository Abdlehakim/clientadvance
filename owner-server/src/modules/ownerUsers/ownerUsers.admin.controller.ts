import type { Request, Response } from "express";
import {
  createOwnerAdminUser,
  disableOwnerAdminUser,
  enableOwnerAdminUser,
  listOwnerAdminUsers,
  listOwnerAdminUsersByCompany,
  resetOwnerAdminUserPassword,
  updateOwnerAdminUser,
} from "./ownerUsers.admin.service.js";

export async function listOwnerAdminUsersController(_req: Request, res: Response) {
  const admins = await listOwnerAdminUsers();
  res.json({ admins });
}

export async function listOwnerCompanyAdminsController(req: Request, res: Response) {
  const admins = await listOwnerAdminUsersByCompany(req.params.id);
  res.json({ admins });
}

export async function createOwnerCompanyAdminController(req: Request, res: Response) {
  const result = await createOwnerAdminUser(req.params.id, req.body);
  res.status(201).json(result);
}

export async function updateOwnerAdminUserController(req: Request, res: Response) {
  const admin = await updateOwnerAdminUser(req.params.id, req.body);
  res.json(admin);
}

export async function resetOwnerAdminUserPasswordController(
  req: Request,
  res: Response,
) {
  const result = await resetOwnerAdminUserPassword(req.params.id, req.body);
  res.json(result);
}

export async function disableOwnerAdminUserController(req: Request, res: Response) {
  const admin = await disableOwnerAdminUser(req.params.id);
  res.json(admin);
}

export async function enableOwnerAdminUserController(req: Request, res: Response) {
  const admin = await enableOwnerAdminUser(req.params.id);
  res.json(admin);
}
