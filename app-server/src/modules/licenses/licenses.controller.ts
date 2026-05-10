import type { Request, Response } from "express";
import { activateLicense, checkLicense } from "./licenses.service.js";

export async function activateLicenseController(req: Request, res: Response) {
  const activation = await activateLicense(req.body);
  res.json(activation);
}

export async function checkLicenseController(req: Request, res: Response) {
  const result = await checkLicense(req.body);
  res.json(result);
}
