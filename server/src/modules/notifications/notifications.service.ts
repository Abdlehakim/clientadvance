import { NotificationStatus, NotificationType } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { createId } from "../../utils/ids.js";
import { HttpError } from "../../utils/httpError.js";
import { createActivityLog } from "../activityLogs/activityLogs.service.js";

interface Actor {
  id: string;
  name: string;
}

interface CreateQueueInput {
  id?: string;
  type: "email" | "whatsapp";
  recipient: string;
  subject?: string;
  body: string;
  payment_id?: string;
  status?: "pending" | "sent" | "failed";
  error_message?: string;
  created_at?: string;
  sent_at?: string;
}

function serialize(notification: {
  id: string;
  type: NotificationType;
  recipient: string;
  subject: string | null;
  body: string;
  paymentId: string | null;
  status: NotificationStatus;
  errorMessage: string | null;
  createdAt: Date;
  sentAt: Date | null;
}) {
  return {
    id: notification.id,
    type: notification.type,
    recipient: notification.recipient,
    subject: notification.subject ?? "",
    body: notification.body,
    payment_id: notification.paymentId ?? "",
    status: notification.status,
    error_message: notification.errorMessage ?? null,
    created_at: notification.createdAt.toISOString(),
    sent_at: notification.sentAt?.toISOString() ?? null,
  };
}

export async function listNotifications() {
  const notifications = await prisma.notificationQueue.findMany({
    orderBy: { createdAt: "desc" },
  });

  return notifications.map(serialize);
}

export async function createNotificationQueueItem(input: CreateQueueInput, actor?: Actor) {
  const notification = await prisma.notificationQueue.create({
    data: {
      id: input.id ?? createId("notif"),
      type: input.type,
      recipient: input.recipient,
      subject: input.subject || null,
      body: input.body,
      paymentId: input.payment_id || null,
      status: input.status ?? NotificationStatus.pending,
      errorMessage: input.error_message || null,
      createdAt: input.created_at ? new Date(input.created_at) : new Date(),
      sentAt: input.sent_at ? new Date(input.sent_at) : null,
    },
  });

  if (actor) {
    await createActivityLog({
      userId: actor.id,
      userName: actor.name,
      actionType: "notification_created",
      description: `Notification ${notification.type} en attente pour ${notification.recipient}`,
      entityType: "notification",
      entityId: notification.id,
    });
  }

  return serialize(notification);
}

export async function createEmailNotification(
  input: Omit<CreateQueueInput, "type">,
  actor: Actor,
) {
  // TODO: branch this queue item to SMTP delivery workers once SMTP credentials are configured.
  return createNotificationQueueItem({ ...input, type: "email" }, actor);
}

export async function createWhatsAppNotification(
  input: Omit<CreateQueueInput, "type">,
  actor: Actor,
) {
  // TODO: branch this queue item to WhatsApp Business / Cloud API delivery workers once credentials are configured.
  return createNotificationQueueItem({ ...input, type: "whatsapp" }, actor);
}

export async function markNotificationAsSent(id: string, actor: Actor) {
  const existing = await prisma.notificationQueue.findUnique({ where: { id } });

  if (!existing) {
    throw new HttpError(404, "Notification introuvable");
  }

  const notification = await prisma.notificationQueue.update({
    where: { id },
    data: {
      status: NotificationStatus.sent,
      errorMessage: null,
      sentAt: new Date(),
    },
  });

  await createActivityLog({
    userId: actor.id,
    userName: actor.name,
    actionType: "notification_sent",
    description: `Notification envoyée à ${notification.recipient}`,
    entityType: "notification",
    entityId: notification.id,
  });

  return serialize(notification);
}

export async function markNotificationAsFailed(id: string, errorMessage: string, actor: Actor) {
  const existing = await prisma.notificationQueue.findUnique({ where: { id } });

  if (!existing) {
    throw new HttpError(404, "Notification introuvable");
  }

  const notification = await prisma.notificationQueue.update({
    where: { id },
    data: {
      status: NotificationStatus.failed,
      errorMessage,
      sentAt: null,
    },
  });

  await createActivityLog({
    userId: actor.id,
    userName: actor.name,
    actionType: "notification_failed",
    description: `Échec de notification pour ${notification.recipient}`,
    entityType: "notification",
    entityId: notification.id,
  });

  return serialize(notification);
}
