import type { Request, Response } from "express";
import { createActivityLog, listActivityLogs } from "./activityLogs.service.js";

export async function getActivityLogsController(_req: Request, res: Response) {
  const logs = await listActivityLogs();
  res.json(logs);
}

export async function createActivityLogController(req: Request, res: Response) {
  const log = await createActivityLog({
    userId: req.body.user_id,
    userName: req.body.user_name,
    actionType: req.body.action_type,
    description: req.body.description,
    entityType: req.body.entity_type,
    entityId: req.body.entity_id,
    createdAt: req.body.created_at,
  });

  res.status(201).json(log);
}
