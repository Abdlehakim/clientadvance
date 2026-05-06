import type { Request, Response } from "express";
import { getAdminSettings, updateAdminSettings } from "./adminSettings.service.js";

export async function getAdminSettingsController(_req: Request, res: Response) {
  const settings = await getAdminSettings();
  res.json(settings);
}

export async function updateAdminSettingsController(req: Request, res: Response) {
  const settings = await updateAdminSettings(req.body, req.user!);
  res.json(settings);
}
