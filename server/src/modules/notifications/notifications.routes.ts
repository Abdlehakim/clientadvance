import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
  createEmailNotificationController,
  createWhatsAppNotificationController,
  getNotificationsController,
  markNotificationFailedController,
  markNotificationSentController,
} from "./notifications.controller.js";
import {
  createEmailNotificationSchema,
  createWhatsAppNotificationSchema,
  markFailedNotificationSchema,
  notificationParamsSchema,
} from "./notifications.validation.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", asyncHandler(getNotificationsController));
notificationsRouter.post(
  "/email",
  validateRequest({ body: createEmailNotificationSchema }),
  asyncHandler(createEmailNotificationController),
);
notificationsRouter.post(
  "/whatsapp",
  validateRequest({ body: createWhatsAppNotificationSchema }),
  asyncHandler(createWhatsAppNotificationController),
);
notificationsRouter.post(
  "/:id/mark-sent",
  validateRequest({ params: notificationParamsSchema }),
  asyncHandler(markNotificationSentController),
);
notificationsRouter.post(
  "/:id/mark-failed",
  validateRequest({ params: notificationParamsSchema, body: markFailedNotificationSchema }),
  asyncHandler(markNotificationFailedController),
);
