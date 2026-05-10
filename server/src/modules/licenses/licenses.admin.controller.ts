import type { Request, Response } from "express";
import {
  createAdminLicense,
  deactivateAdminLicenseActivation,
  getAdminLicenseById,
  listAdminLicenses,
  reactivateAdminLicense,
  revokeAdminLicense,
  suspendAdminLicense,
  updateAdminLicense,
} from "./licenses.service.js";

export async function listAdminLicensesController(_req: Request, res: Response) {
  const licenses = await listAdminLicenses();
  res.json({ licenses });
}

export async function getAdminLicenseController(req: Request, res: Response) {
  const license = await getAdminLicenseById(req.params.id);
  res.json(license);
}

export async function createAdminLicenseController(req: Request, res: Response) {
  const result = await createAdminLicense(req.body);
  res.status(201).json(result);
}

export async function updateAdminLicenseController(req: Request, res: Response) {
  const license = await updateAdminLicense(req.params.id, req.body);
  res.json(license);
}

export async function revokeAdminLicenseController(req: Request, res: Response) {
  const license = await revokeAdminLicense(req.params.id);
  res.json(license);
}

export async function suspendAdminLicenseController(req: Request, res: Response) {
  const license = await suspendAdminLicense(req.params.id);
  res.json(license);
}

export async function reactivateAdminLicenseController(req: Request, res: Response) {
  const license = await reactivateAdminLicense(req.params.id);
  res.json(license);
}

export async function deactivateAdminLicenseActivationController(
  req: Request,
  res: Response,
) {
  const license = await deactivateAdminLicenseActivation(
    req.params.id,
    req.params.activationId,
  );
  res.json(license);
}
