import type {
  AdminSettings,
  AdminSettingsUpdateInput,
  NotificationDeliveryMode,
  SmtpProviderType,
} from "@/domain/types";

const env = import.meta.env as ImportMetaEnv & {
  VITE_NOTIFICATION_DELIVERY_MODE?: string;
};

export const SMTP_PASSWORD_MASK = "••••••••";

export function readNotificationDeliveryMode(value: unknown): NotificationDeliveryMode {
  return value === "backend" || value === "desktop-email" || value === "hybrid-email"
    ? value
    : "hybrid-email";
}

export function getDefaultNotificationDeliveryMode() {
  return readNotificationDeliveryMode(env.VITE_NOTIFICATION_DELIVERY_MODE);
}

export function readSmtpProviderType(value: unknown): SmtpProviderType {
  return value === "gmail" || value === "professional" || value === "custom"
    ? value
    : "custom";
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function readBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    if (value === "1" || value.toLowerCase() === "true") {
      return true;
    }

    if (value === "0" || value.toLowerCase() === "false") {
      return false;
    }
  }

  return fallback;
}

function readNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export function createAdminSettingsFallback(): AdminSettings {
  return {
    id: "settings_default",
    admin_email: "",
    admin_whatsapp: "",
    notification_delivery_mode: getDefaultNotificationDeliveryMode(),
    smtp_provider_type: "custom",
    smtp_host: "",
    smtp_port: 587,
    smtp_username: "",
    smtp_password: "",
    smtp_password_configured: false,
    smtp_secure: true,
    smtp_from_email: "",
    smtp_from_name: "",
    updated_at: new Date().toISOString(),
    updated_by: "",
    remote_updated_at: undefined,
    pending_sync: false,
    sync_status: "synced",
  };
}

export function normalizeAdminSettings(
  value: Partial<AdminSettings> | null | undefined,
): AdminSettings {
  const fallback = createAdminSettingsFallback();
  const smtpPasswordConfigured = readBoolean(
    value?.smtp_password_configured,
    !!readString(value?.smtp_password).trim(),
  );

  return {
    ...fallback,
    ...value,
    id: readString(value?.id, fallback.id),
    admin_email: readString(value?.admin_email, fallback.admin_email),
    admin_whatsapp: readString(value?.admin_whatsapp, fallback.admin_whatsapp),
    notification_delivery_mode: readNotificationDeliveryMode(
      value?.notification_delivery_mode,
    ),
    smtp_provider_type: readSmtpProviderType(value?.smtp_provider_type),
    smtp_host: readString(value?.smtp_host, fallback.smtp_host),
    smtp_port: readNumber(value?.smtp_port, fallback.smtp_port),
    smtp_username: readString(value?.smtp_username, fallback.smtp_username),
    smtp_password: "",
    smtp_password_configured: smtpPasswordConfigured,
    smtp_secure: readBoolean(value?.smtp_secure, fallback.smtp_secure),
    smtp_from_email: readString(value?.smtp_from_email, fallback.smtp_from_email),
    smtp_from_name: readString(value?.smtp_from_name, fallback.smtp_from_name),
    updated_at: readString(value?.updated_at, fallback.updated_at),
    updated_by: readString(value?.updated_by, fallback.updated_by),
    remote_updated_at:
      typeof value?.remote_updated_at === "string" ? value.remote_updated_at : undefined,
    pending_sync: readBoolean(value?.pending_sync, fallback.pending_sync),
    sync_status:
      value?.sync_status === "failed" ||
      value?.sync_status === "pending" ||
      value?.sync_status === "local" ||
      value?.sync_status === "synced"
        ? value.sync_status
        : fallback.sync_status,
  };
}

export function didSyncableAdminSettingsChange(
  current: AdminSettings,
  patch: AdminSettingsUpdateInput,
) {
  return (
    (patch.admin_email !== undefined && patch.admin_email !== current.admin_email) ||
    (patch.admin_whatsapp !== undefined && patch.admin_whatsapp !== current.admin_whatsapp)
  );
}

export function applyAdminSettingsUpdate(
  current: AdminSettings,
  patch: AdminSettingsUpdateInput,
  meta: {
    updatedAt: string;
    updatedBy: string;
    smtpPasswordConfigured: boolean;
  },
) {
  const syncableChanged = didSyncableAdminSettingsChange(current, patch);

  return normalizeAdminSettings({
    ...current,
    ...patch,
    id: "settings_default",
    updated_at: meta.updatedAt,
    updated_by: meta.updatedBy,
    remote_updated_at: syncableChanged
      ? meta.updatedAt
      : current.remote_updated_at,
    pending_sync: syncableChanged ? true : current.pending_sync,
    sync_status: syncableChanged ? "pending" : current.sync_status,
    smtp_password_configured: meta.smtpPasswordConfigured,
  });
}

export function hasSmtpConfiguration(settings: AdminSettings) {
  return (
    settings.smtp_host.trim().length > 0 &&
    settings.smtp_port > 0 &&
    settings.smtp_username.trim().length > 0 &&
    settings.smtp_from_email.trim().length > 0 &&
    settings.smtp_password_configured
  );
}
