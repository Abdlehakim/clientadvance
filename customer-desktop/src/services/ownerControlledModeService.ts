import type { AdminSettings, NotificationDeliveryMode, ServerMode } from "@/domain/types";
import {
  createAdminSettingsFallback,
  getNotificationDeliveryModeForServerMode,
  normalizeAdminSettings,
  readServerMode,
} from "@/infrastructure/local/adminSettingsState";
import {
  emitChange,
  isBrowser,
  KEYS,
  read,
  write,
} from "@/infrastructure/local/localStorageDatabase";
import {
  getDb,
  isTauriRuntime,
} from "@/infrastructure/local/sqlite/sqliteClient";
import { reloadSqliteCache } from "@/services/sqliteCachedServices";

interface OwnerControlledModePayload {
  server_mode?: unknown;
  notification_delivery_mode?: unknown;
}

interface NormalizedOwnerControlledMode {
  server_mode: ServerMode;
  notification_delivery_mode: NotificationDeliveryMode;
}

const SETTINGS_ID = "settings_default";

function hasModePayload(value: OwnerControlledModePayload | null | undefined) {
  return (
    value?.server_mode === "with-server" ||
    value?.server_mode === "without-server" ||
    value?.notification_delivery_mode === "backend" ||
    value?.notification_delivery_mode === "desktop-email"
  );
}

function normalizeOwnerControlledMode(
  value: OwnerControlledModePayload | null | undefined,
): NormalizedOwnerControlledMode | null {
  if (!hasModePayload(value)) {
    return null;
  }

  const serverMode = readServerMode(
    value?.server_mode,
    value?.notification_delivery_mode,
  );

  return {
    server_mode: serverMode,
    notification_delivery_mode: getNotificationDeliveryModeForServerMode(serverMode),
  };
}

function getModeSyncStatus(serverMode: ServerMode): AdminSettings["sync_status"] {
  return serverMode === "without-server" ? "local" : "synced";
}

function persistLocalStorageMode(mode: NormalizedOwnerControlledMode, updatedAt: string) {
  if (!isBrowser()) {
    return;
  }

  const current = normalizeAdminSettings(
    read<AdminSettings>(KEYS.settings, createAdminSettingsFallback()),
  );

  write(
    KEYS.settings,
    normalizeAdminSettings({
      ...current,
      server_mode: mode.server_mode,
      notification_delivery_mode: mode.notification_delivery_mode,
      updated_at: updatedAt,
      updated_by: "owner",
      remote_updated_at: updatedAt,
      pending_sync: false,
      sync_status: getModeSyncStatus(mode.server_mode),
    }),
  );
}

async function persistSqliteMode(mode: NormalizedOwnerControlledMode, updatedAt: string) {
  if (import.meta.env.VITE_STORAGE_DRIVER !== "sqlite" || !isTauriRuntime()) {
    return;
  }

  const fallback = createAdminSettingsFallback();
  const db = await getDb();

  await db.execute(
    `
      INSERT INTO admin_settings (
        id,
        admin_email,
        admin_whatsapp,
        notification_retention_days,
        setup_completed,
        server_mode,
        notification_delivery_mode,
        smtp_provider_type,
        smtp_host,
        smtp_port,
        smtp_username,
        smtp_password_configured,
        smtp_secure,
        smtp_from_email,
        smtp_from_name,
        updated_at,
        updated_by,
        remote_updated_at,
        pending_sync,
        sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        server_mode = excluded.server_mode,
        notification_delivery_mode = excluded.notification_delivery_mode,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by,
        remote_updated_at = excluded.remote_updated_at,
        pending_sync = excluded.pending_sync,
        sync_status = excluded.sync_status
    `,
    [
      SETTINGS_ID,
      fallback.admin_email,
      fallback.admin_whatsapp,
      fallback.notification_retention_days,
      fallback.setup_completed ? 1 : 0,
      mode.server_mode,
      mode.notification_delivery_mode,
      fallback.smtp_provider_type,
      fallback.smtp_host,
      fallback.smtp_port,
      fallback.smtp_username,
      fallback.smtp_password_configured ? 1 : 0,
      fallback.smtp_secure ? 1 : 0,
      fallback.smtp_from_email,
      fallback.smtp_from_name,
      updatedAt,
      "owner",
      updatedAt,
      0,
      getModeSyncStatus(mode.server_mode),
    ],
  );

  await reloadSqliteCache();
}

export async function persistOwnerControlledAdminModes(
  value: OwnerControlledModePayload | null | undefined,
) {
  const mode = normalizeOwnerControlledMode(value);

  if (!mode) {
    return;
  }

  const updatedAt = new Date().toISOString();
  persistLocalStorageMode(mode, updatedAt);

  try {
    await persistSqliteMode(mode, updatedAt);
  } catch (error) {
    console.error("Owner-controlled mode persistence failed.", error);
    emitChange();
  }
}
