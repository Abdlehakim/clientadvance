import type { Request, Response } from "express";
import { activateLicense } from "./licenses.service.js";

export async function activateLicenseController(req: Request, res: Response) {
  const activation = await activateLicense(req.body);
  res.json(activation);
}
