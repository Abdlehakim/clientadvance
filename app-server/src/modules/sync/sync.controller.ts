import type { Request, Response } from "express";
import { fullSync, pullSyncData, pushSyncData } from "./sync.service.js";

export async function pushSyncController(req: Request, res: Response) {
  const result = await pushSyncData(req.body, req.user!);
  res.json(result);
}

export async function pullSyncController(req: Request, res: Response) {
  const result = await pullSyncData(
    typeof req.query.since === "string" ? req.query.since : undefined,
    req.user!,
  );
  res.json(result);
}

export async function fullSyncController(req: Request, res: Response) {
  const result = await fullSync(req.body, req.user!);
  res.json(result);
}
