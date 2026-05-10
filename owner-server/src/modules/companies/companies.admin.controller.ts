import type { Request, Response } from "express";
import {
  createAdminCompany,
  createAdminCompanyLicenseBundle,
  getAdminCompanyById,
  listAdminCompanies,
  updateAdminCompany,
} from "./companies.admin.service.js";
import {
  createOwnerAdminUser,
  listOwnerAdminUsersByCompany,
} from "../ownerUsers/ownerUsers.admin.service.js";

export async function listAdminCompaniesController(_req: Request, res: Response) {
  const companies = await listAdminCompanies();
  res.json({ companies });
}

export async function createAdminCompanyController(req: Request, res: Response) {
  const company = await createAdminCompany(req.body);
  res.status(201).json(company);
}

export async function getAdminCompanyController(req: Request, res: Response) {
  const company = await getAdminCompanyById(req.params.id);
  res.json(company);
}

export async function updateAdminCompanyController(req: Request, res: Response) {
  const company = await updateAdminCompany(req.params.id, req.body);
  res.json(company);
}

export async function createAdminCompanyLicenseBundleController(
  req: Request,
  res: Response,
) {
  const result = await createAdminCompanyLicenseBundle(req.params.id, req.body);
  res.status(201).json(result);
}

export async function listAdminCompanyAdminsController(req: Request, res: Response) {
  const admins = await listOwnerAdminUsersByCompany(req.params.id);
  res.json({ admins });
}

export async function createAdminCompanyAdminController(req: Request, res: Response) {
  const result = await createOwnerAdminUser(req.params.id, req.body);
  res.status(201).json(result);
}
