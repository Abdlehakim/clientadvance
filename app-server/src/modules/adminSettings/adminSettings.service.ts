import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../utils/httpError.js";
import { createActivityLog } from "../activityLogs/activityLogs.service.js";

interface Actor {
  id: string;
  name: string;
  companyId?: string | null;
}

type ServerModeValue = "with-server" | "without-server";
type NotificationDeliveryModeValue = "backend" | "desktop-email";

interface AdminSettingsInput {
  id?: string;
  admin_email?: string;
  admin_whatsapp?: string;
  updated_at?: string;
  updated_by?: string;
  remote_updated_at?: string;
}

interface CompanyModeSettings {
  server_mode: ServerModeValue;
  notification_delivery_mode: NotificationDeliveryModeValue;
}

function getNotificationDeliveryModeForServerMode(
  serverMode: ServerModeValue,
): NotificationDeliveryModeValue {
  return serverMode === "with-server" ? "backend" : "desktop-email";
}

async function getCompanyModeSettings(
  companyId: string | null | undefined,
): Promise<CompanyModeSettings> {
  if (!companyId) {
    return {
      server_mode: "without-server",
      notification_delivery_mode: "desktop-email",
    };
  }

  const rows = await prisma.$queryRaw<CompanyModeSettings[]>`
    SELECT
      COALESCE(server_mode, 'without-server') AS server_mode,
      COALESCE(
        notification_delivery_mode,
        CASE
          WHEN COALESCE(server_mode, 'without-server') = 'with-server'
            THEN 'backend'
          ELSE 'desktop-email'
        END
      ) AS notification_delivery_mode
    FROM companies
    WHERE id = ${companyId}
    LIMIT 1
  `;

  const mode = rows[0]?.server_mode === "with-server" ? "with-server" : "without-server";

  return {
    server_mode: mode,
    notification_delivery_mode:
      rows[0]?.notification_delivery_mode ??
      getNotificationDeliveryModeForServerMode(mode),
  };
}

function serialize(settings: {
  id: string;
  adminEmail: string | null;
  adminWhatsapp: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  remoteUpdatedAt: Date;
}, companyModes: CompanyModeSettings) {
  return {
    id: settings.id,
    admin_email: settings.adminEmail ?? "",
    admin_whatsapp: settings.adminWhatsapp ?? "",
    server_mode: companyModes.server_mode,
    notification_delivery_mode: companyModes.notification_delivery_mode,
    updated_at: settings.updatedAt.toISOString(),
    updated_by: settings.updatedBy ?? "",
    remote_updated_at: settings.remoteUpdatedAt.toISOString(),
    pending_sync: false,
    sync_status: "synced" as const,
  };
}

export async function getAdminSettings(actor?: Pick<Actor, "companyId"> | null) {
  const companyModes = await getCompanyModeSettings(actor?.companyId);
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

  return serialize(settings, companyModes);
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

  return serialize(settings, await getCompanyModeSettings(actor.companyId));
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
