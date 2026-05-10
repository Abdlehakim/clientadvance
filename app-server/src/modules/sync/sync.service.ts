import { NotificationStatus, NotificationType } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { createActivityLog } from "../activityLogs/activityLogs.service.js";
import { getAdminSettings } from "../adminSettings/adminSettings.service.js";

interface Actor {
  id: string;
  name: string;
}

interface SyncPayload {
  clients: Array<{
    id: string;
    nom_complet: string;
    telephone?: string;
    adresse?: string;
    email?: string;
    cin?: string;
    created_at: string;
    updated_at: string;
    created_by?: string;
    updated_by?: string;
    deleted_at?: string | null;
    remote_updated_at?: string;
  }>;
  payments: Array<{
    id: string;
    client_id: string;
    montant: number;
    date_paiement: string;
    heure_paiement: string;
    created_by?: string;
    created_at: string;
    remote_updated_at?: string;
  }>;
  adminSettings: {
    id?: string;
    admin_email?: string;
    admin_whatsapp?: string;
    updated_at: string;
    updated_by?: string;
    remote_updated_at?: string;
  } | null;
  activityLogs: Array<{
    id: string;
    user_id?: string;
    user_name: string;
    action_type: string;
    description: string;
    entity_type?: string;
    entity_id?: string;
    created_at: string;
  }>;
  notifications: Array<{
    id: string;
    type: "email" | "whatsapp";
    recipient: string;
    subject?: string;
    body: string;
    payment_id?: string;
    status: "pending" | "sent" | "failed";
    error_message?: string | null;
    created_at: string;
    sent_at?: string | null;
  }>;
}

function parseDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function createUserIdResolver() {
  const cache = new Map<string, string | null>();

  return async (candidate: string | null | undefined, fallback: string | null = null) => {
    const normalizedCandidate = candidate?.trim();

    if (!normalizedCandidate) {
      return fallback;
    }

    if (cache.has(normalizedCandidate)) {
      return cache.get(normalizedCandidate) ?? fallback;
    }

    const user = await prisma.user.findUnique({
      where: { id: normalizedCandidate },
      select: { id: true },
    });
    const resolved = user?.id ?? null;

    cache.set(normalizedCandidate, resolved);

    return resolved ?? fallback;
  };
}

function isIncomingNewer(incoming: Date, current?: Date | null) {
  if (!current) return true;
  return incoming.getTime() > current.getTime();
}

function toClientResponse(client: {
  id: string;
  nomComplet: string;
  telephone: string | null;
  adresse: string | null;
  email: string | null;
  cin: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  remoteUpdatedAt: Date;
}) {
  return {
    id: client.id,
    nom_complet: client.nomComplet,
    telephone: client.telephone ?? "",
    adresse: client.adresse ?? "",
    email: client.email ?? "",
    cin: client.cin ?? "",
    created_at: client.createdAt.toISOString(),
    updated_at: client.updatedAt.toISOString(),
    created_by: client.createdBy ?? "",
    updated_by: client.updatedBy ?? "",
    deleted_at: client.deletedAt?.toISOString() ?? null,
    remote_updated_at: client.remoteUpdatedAt.toISOString(),
    pending_sync: false,
    sync_status: "synced" as const,
  };
}

function toPaymentResponse(payment: {
  id: string;
  clientId: string;
  montant: { toNumber(): number };
  datePaiement: string;
  heurePaiement: string;
  createdBy: string | null;
  createdAt: Date;
  remoteUpdatedAt: Date;
}) {
  return {
    id: payment.id,
    client_id: payment.clientId,
    montant: payment.montant.toNumber(),
    date_paiement: payment.datePaiement,
    heure_paiement: payment.heurePaiement,
    created_by: payment.createdBy ?? "",
    created_at: payment.createdAt.toISOString(),
    remote_updated_at: payment.remoteUpdatedAt.toISOString(),
    pending_sync: false,
    sync_status: "synced" as const,
  };
}

function toLogResponse(log: {
  id: string;
  userId: string | null;
  userName: string;
  actionType: string;
  description: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
}) {
  return {
    id: log.id,
    user_id: log.userId ?? "",
    user_name: log.userName,
    action_type: log.actionType,
    description: log.description,
    entity_type: log.entityType ?? "",
    entity_id: log.entityId ?? "",
    created_at: log.createdAt.toISOString(),
  };
}

function toNotificationResponse(notification: {
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

async function updateSyncState(userId: string, timestamp: Date) {
  await prisma.syncState.upsert({
    where: { id: `sync_${userId}` },
    update: { userId, lastSyncAt: timestamp },
    create: {
      id: `sync_${userId}`,
      userId,
      lastSyncAt: timestamp,
    },
  });
}

export async function pushSyncData(payload: SyncPayload, actor: Actor) {
  const synced = {
    clients: 0,
    payments: 0,
    adminSettings: 0,
    activityLogs: 0,
    notifications: 0,
  };
  const failedItems: Array<{ entity: string; id?: string; reason: string }> = [];
  const resolveUserId = createUserIdResolver();

  for (const item of payload.clients) {
    try {
      const existing = await prisma.client.findUnique({ where: { id: item.id } });
      const incomingUpdatedAt = parseDate(item.updated_at) ?? new Date();
      const incomingRemoteUpdatedAt = parseDate(item.remote_updated_at) ?? incomingUpdatedAt;
      const createdBy = await resolveUserId(item.created_by, actor.id);
      const updatedBy = await resolveUserId(item.updated_by, actor.id);

      if (!existing) {
        await prisma.client.create({
          data: {
            id: item.id,
            nomComplet: item.nom_complet,
            telephone: item.telephone || null,
            adresse: item.adresse || null,
            email: item.email || null,
            cin: item.cin || null,
            createdAt: parseDate(item.created_at) ?? new Date(),
            updatedAt: incomingUpdatedAt,
            createdBy,
            updatedBy,
            deletedAt: parseDate(item.deleted_at) ?? null,
            remoteUpdatedAt: incomingRemoteUpdatedAt,
          },
        });
        synced.clients += 1;
        continue;
      }

      const currentLatest = existing.remoteUpdatedAt ?? existing.updatedAt;
      if (!isIncomingNewer(incomingRemoteUpdatedAt, currentLatest)) {
        continue;
      }

      await prisma.client.update({
        where: { id: item.id },
        data: {
          nomComplet: item.nom_complet,
          telephone: item.telephone || null,
          adresse: item.adresse || null,
          email: item.email || null,
          cin: item.cin || null,
          updatedAt: incomingUpdatedAt,
          updatedBy,
          deletedAt: item.deleted_at === undefined ? existing.deletedAt : parseDate(item.deleted_at),
          remoteUpdatedAt: incomingRemoteUpdatedAt,
        },
      });
      synced.clients += 1;
    } catch (error) {
      failedItems.push({ entity: "client", id: item.id, reason: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  for (const item of payload.payments) {
    try {
      const client = await prisma.client.findFirst({ where: { id: item.client_id, deletedAt: null } });
      if (!client) {
        failedItems.push({ entity: "payment", id: item.id, reason: "Client introuvable" });
        continue;
      }

      const existing = await prisma.payment.findUnique({ where: { id: item.id } });
      const incomingRemoteUpdatedAt = parseDate(item.remote_updated_at) ?? parseDate(item.created_at) ?? new Date();
      const createdBy = await resolveUserId(item.created_by, actor.id);

      if (!existing) {
        await prisma.payment.create({
          data: {
            id: item.id,
            clientId: item.client_id,
            montant: item.montant,
            datePaiement: item.date_paiement,
            heurePaiement: item.heure_paiement,
            createdBy,
            createdAt: parseDate(item.created_at) ?? new Date(),
            remoteUpdatedAt: incomingRemoteUpdatedAt,
          },
        });
        synced.payments += 1;
        continue;
      }

      if (!isIncomingNewer(incomingRemoteUpdatedAt, existing.remoteUpdatedAt)) {
        continue;
      }

      await prisma.payment.update({
        where: { id: item.id },
        data: {
          clientId: item.client_id,
          montant: item.montant,
          datePaiement: item.date_paiement,
          heurePaiement: item.heure_paiement,
          remoteUpdatedAt: incomingRemoteUpdatedAt,
        },
      });
      synced.payments += 1;
    } catch (error) {
      failedItems.push({ entity: "payment", id: item.id, reason: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  if (payload.adminSettings) {
    try {
      const existing = await prisma.adminSettings.findUnique({ where: { id: payload.adminSettings.id ?? "settings_default" } });
      const incomingUpdatedAt = parseDate(payload.adminSettings.updated_at) ?? new Date();
      const incomingRemoteUpdatedAt = parseDate(payload.adminSettings.remote_updated_at) ?? incomingUpdatedAt;
      const updatedBy = await resolveUserId(payload.adminSettings.updated_by, actor.id);

      if (!existing) {
        await prisma.adminSettings.create({
          data: {
            id: payload.adminSettings.id ?? "settings_default",
            adminEmail: payload.adminSettings.admin_email || null,
            adminWhatsapp: payload.adminSettings.admin_whatsapp || null,
            updatedAt: incomingUpdatedAt,
            updatedBy,
            remoteUpdatedAt: incomingRemoteUpdatedAt,
          },
        });
        synced.adminSettings += 1;
      } else if (isIncomingNewer(incomingRemoteUpdatedAt, existing.remoteUpdatedAt)) {
        await prisma.adminSettings.update({
          where: { id: existing.id },
          data: {
            adminEmail: payload.adminSettings.admin_email !== undefined ? payload.adminSettings.admin_email || null : existing.adminEmail,
            adminWhatsapp: payload.adminSettings.admin_whatsapp !== undefined ? payload.adminSettings.admin_whatsapp || null : existing.adminWhatsapp,
            updatedAt: incomingUpdatedAt,
            updatedBy,
            remoteUpdatedAt: incomingRemoteUpdatedAt,
          },
        });
        synced.adminSettings += 1;
      }
    } catch (error) {
      failedItems.push({ entity: "adminSettings", reason: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  for (const item of payload.activityLogs) {
    try {
      const existing = await prisma.activityLog.findUnique({ where: { id: item.id } });
      if (existing) continue;
      const userId = await resolveUserId(item.user_id, null);

      await prisma.activityLog.create({
        data: {
          id: item.id,
          userId,
          userName: item.user_name,
          actionType: item.action_type,
          description: item.description,
          entityType: item.entity_type || null,
          entityId: item.entity_id || null,
          createdAt: parseDate(item.created_at) ?? new Date(),
        },
      });
      synced.activityLogs += 1;
    } catch (error) {
      failedItems.push({ entity: "activityLog", id: item.id, reason: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  for (const item of payload.notifications) {
    try {
      const existing = await prisma.notificationQueue.findUnique({ where: { id: item.id } });
      const incomingCreatedAt = parseDate(item.created_at) ?? new Date();
      const incomingSentAt = parseDate(item.sent_at) ?? (item.status === "pending" ? null : new Date());

      if (!existing) {
        await prisma.notificationQueue.create({
          data: {
            id: item.id,
            type: item.type,
            recipient: item.recipient,
            subject: item.subject || null,
            body: item.body,
            paymentId: item.payment_id || null,
            status: item.status,
            errorMessage: item.error_message ?? null,
            createdAt: incomingCreatedAt,
            sentAt: incomingSentAt,
          },
        });
        synced.notifications += 1;
        continue;
      }

      const currentLatest = existing.sentAt ?? existing.createdAt;
      const incomingLatest = incomingSentAt ?? incomingCreatedAt;
      if (!isIncomingNewer(incomingLatest, currentLatest)) {
        continue;
      }

      await prisma.notificationQueue.update({
        where: { id: item.id },
        data: {
          recipient: item.recipient,
          subject: item.subject || null,
          body: item.body,
          paymentId: item.payment_id || null,
          status: item.status,
          errorMessage: item.error_message ?? null,
          sentAt: incomingSentAt,
        },
      });
      synced.notifications += 1;
    } catch (error) {
      failedItems.push({ entity: "notification", id: item.id, reason: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  const serverTimestamp = new Date();
  await updateSyncState(actor.id, serverTimestamp);

  await createActivityLog({
    userId: actor.id,
    userName: actor.name,
    actionType: "sync_push",
    description: "Synchronisation push exécutée",
    entityType: "sync",
    entityId: actor.id,
  });

  return {
    success: true,
    synced,
    failedItems,
    serverTimestamp: serverTimestamp.toISOString(),
  };
}

export async function pullSyncData(since: string | undefined, actor: Actor) {
  const sinceDate = since ? new Date(since) : new Date(0);

  const [clients, payments, activityLogs, notifications, adminSettings] = await Promise.all([
    prisma.client.findMany({
      where: { remoteUpdatedAt: { gt: sinceDate } },
      orderBy: { remoteUpdatedAt: "asc" },
    }),
    prisma.payment.findMany({
      where: { remoteUpdatedAt: { gt: sinceDate } },
      orderBy: { remoteUpdatedAt: "asc" },
    }),
    prisma.activityLog.findMany({
      where: { createdAt: { gt: sinceDate } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.notificationQueue.findMany({
      where: {
        OR: [
          { createdAt: { gt: sinceDate } },
          { sentAt: { gt: sinceDate } },
        ],
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.adminSettings.findUnique({ where: { id: "settings_default" } }),
  ]);

  const shouldReturnSettings = adminSettings
    ? adminSettings.remoteUpdatedAt.getTime() > sinceDate.getTime()
    : false;

  const settingsPayload = shouldReturnSettings ? await getAdminSettings() : null;
  const serverTimestamp = new Date();

  await updateSyncState(actor.id, serverTimestamp);

  await createActivityLog({
    userId: actor.id,
    userName: actor.name,
    actionType: "sync_pull",
    description: "Synchronisation pull exécutée",
    entityType: "sync",
    entityId: actor.id,
  });

  return {
    clients: clients.map(toClientResponse),
    payments: payments.map(toPaymentResponse),
    adminSettings: settingsPayload,
    activityLogs: activityLogs.map(toLogResponse),
    notifications: notifications.map(toNotificationResponse),
    serverTimestamp: serverTimestamp.toISOString(),
  };
}

export async function fullSync(payload: SyncPayload & { since?: string }, actor: Actor) {
  const pushResult = await pushSyncData(payload, actor);
  const pullResult = await pullSyncData(payload.since, actor);

  return {
    ...pullResult,
    success: pushResult.success,
    synced: pushResult.synced,
    failedItems: pushResult.failedItems,
  };
}
