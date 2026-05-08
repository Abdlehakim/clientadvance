import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../utils/httpError.js";
import { createActivityLog } from "../activityLogs/activityLogs.service.js";

interface Actor {
  id: string;
  name: string;
}

interface AdminSettingsInput {
  id?: string;
  admin_email?: string;
  admin_whatsapp?: string;
  updated_at?: string;
  updated_by?: string;
  remote_updated_at?: string;
}

function serialize(settings: {
  id: string;
  adminEmail: string | null;
  adminWhatsapp: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  remoteUpdatedAt: Date;
}) {
  return {
    id: settings.id,
    admin_email: settings.adminEmail ?? "",
    admin_whatsapp: settings.adminWhatsapp ?? "",
    updated_at: settings.updatedAt.toISOString(),
    updated_by: settings.updatedBy ?? "",
    remote_updated_at: settings.remoteUpdatedAt.toISOString(),
    pending_sync: false,
    sync_status: "synced" as const,
  };
}

export async function getAdminSettings() {
  let settings = await prisma.adminSettings.findUnique({ where: { id: "settings_default" } });

  if (!settings) {
    settings = await prisma.adminSettings.create({
      data: {
        id: "settings_default",
        adminEmail: null,
        adminWhatsapp: null,
        remoteUpdatedAt: new Date(),
      },
    });
  }

  return serialize(settings);
}

export async function updateAdminSettings(input: AdminSettingsInput, actor: Actor) {
  const existing = await prisma.adminSettings.findUnique({ where: { id: "settings_default" } });

  if (!existing) {
    throw new HttpError(404, "Paramètres administrateur introuvables");
  }

  const settings = await prisma.adminSettings.update({
    where: { id: "settings_default" },
    data: {
      adminEmail: input.admin_email !== undefined ? input.admin_email || null : existing.adminEmail,
      adminWhatsapp: input.admin_whatsapp !== undefined ? input.admin_whatsapp || null : existing.adminWhatsapp,
      updatedAt: input.updated_at ? new Date(input.updated_at) : new Date(),
      updatedBy: input.updated_by ?? actor.id,
      remoteUpdatedAt: input.remote_updated_at ? new Date(input.remote_updated_at) : new Date(),
    },
  });

  await createActivityLog({
    userId: actor.id,
    userName: actor.name,
    actionType: "settings_update",
    description: "Mise à jour des paramètres administrateur",
    entityType: "settings",
    entityId: settings.id,
  });

  return serialize(settings);
}

export async function resetTestData(_actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const notifications = await tx.notificationQueue.deleteMany({});
    const activityLogs = await tx.activityLog.deleteMany({});
    const payments = await tx.payment.deleteMany({});
    const clients = await tx.client.deleteMany({});
    const syncStates = await tx.syncState.deleteMany({});
    const employees = await tx.user.deleteMany({
      where: { role: "employe" },
    });

    return {
      success: true,
      deleted: {
        notifications: notifications.count,
        activityLogs: activityLogs.count,
        payments: payments.count,
        clients: clients.count,
        syncStates: syncStates.count,
        employees: employees.count,
      },
    };
  });
}
