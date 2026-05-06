import type { Request, Response } from "express";
import {
  createEmailNotification,
  createWhatsAppNotification,
  listNotifications,
  markNotificationAsFailed,
  markNotificationAsSent,
} from "./notifications.service.js";

export async function getNotificationsController(_req: Request, res: Response) {
  const notifications = await listNotifications();
  res.json(notifications);
}

export async function createEmailNotificationController(req: Request, res: Response) {
  const notification = await createEmailNotification(req.body, req.user!);
  res.status(201).json(notification);
}

export async function createWhatsAppNotificationController(req: Request, res: Response) {
  const notification = await createWhatsAppNotification(req.body, req.user!);
  res.status(201).json(notification);
}

export async function markNotificationSentController(req: Request, res: Response) {
  const notification = await markNotificationAsSent(req.params.id!, req.user!);
  res.json(notification);
}

export async function markNotificationFailedController(req: Request, res: Response) {
  const notification = await markNotificationAsFailed(req.params.id!, req.body.error_message, req.user!);
  res.json(notification);
}
