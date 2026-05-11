import type { Request, Response } from "express";
import {
  getAdminSettings,
  resetTestData,
  updateAdminSettings,
} from "./adminSettings.service.js";

export async function getAdminSettingsController(req: Request, res: Response) {
  const settings = await getAdminSettings(req.user!);
  res.json(settings);
}

export async function updateAdminSettingsController(req: Request, res: Response) {
  const settings = await updateAdminSettings(req.body, req.user!);
  res.json(settings);
}

export async function resetTestDataController(req: Request, res: Response) {
  const result = await resetTestData(req.user!);
  res.json(result);
}
