import { z } from "zod";

export const notificationParamsSchema = z.object({
  id: z.string().min(1),
});

export const createEmailNotificationSchema = z.object({
  recipient: z.string().trim().email(),
  subject: z.string().trim().min(1),
  body: z.string().trim().min(1),
  payment_id: z.string().min(1).optional(),
});

export const createWhatsAppNotificationSchema = z.object({
  recipient: z.string().trim().min(1),
  subject: z.string().trim().optional(),
  body: z.string().trim().min(1),
  payment_id: z.string().min(1).optional(),
});

export const markFailedNotificationSchema = z.object({
  error_message: z.string().trim().min(1),
});
