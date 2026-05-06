import type { AdminSettingsRepository } from "@/domain/repositories";
import type { AdminSettings } from "@/domain/types";
import { authLocalRepository } from "@/infrastructure/local/authLocalRepository";
import { activityLogSQLiteRepository } from "./activityLogSQLiteRepository";
import { getDb, type SqliteRow } from "./sqliteClient";

const SETTINGS_ID = "settings_default";

interface AdminSettingsSqliteRow extends SqliteRow {
  id: unknown;
  admin_email: unknown;
  admin_whatsapp: unknown;
  updated_at: unknown;
  updated_by: unknown;
  remote_updated_at: unknown;
  pending_sync: unknown;
  sync_status: unknown;
}

function fallback(): AdminSettings {
  return {
    id: SETTINGS_ID,
    admin_email: "",
    admin_whatsapp: "",
    updated_at: new Date().toISOString(),
    updated_by: "",
    remote_updated_at: undefined,
    pending_sync: false,
    sync_status: "synced",
  };
}

function readString(value: unknown, defaultValue = "") {
  return typeof value === "string" ? value : defaultValue;
}

function readNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    return value === "1" || value.toLowerCase() === "true";
  }

  return false;
}

function readSyncStatus(value: unknown): AdminSettings["sync_status"] {
  return value === "failed" || value === "synced" || value === "local" || value === "pending"
    ? value
    : "synced";
}

function toAdminSettings(row: AdminSettingsSqliteRow): AdminSettings {
  return {
    id: readString(row.id, SETTINGS_ID),
    admin_email: readString(row.admin_email),
    admin_whatsapp: readString(row.admin_whatsapp),
    updated_at: readString(row.updated_at),
    updated_by: readString(row.updated_by),
    remote_updated_at: readNullableString(row.remote_updated_at) ?? undefined,
    pending_sync: readBoolean(row.pending_sync),
    sync_status: readSyncStatus(row.sync_status),
  };
}

export const adminSettingsSQLiteRepository: AdminSettingsRepository = {
  async get() {
    const db = await getDb();
    const rows = await db.query<AdminSettingsSqliteRow>(
      `
        SELECT
          id,
          admin_email,
          admin_whatsapp,
          updated_at,
          updated_by,
          remote_updated_at,
          pending_sync,
          sync_status
        FROM admin_settings
        WHERE id = ?
        LIMIT 1
      `,
      [SETTINGS_ID],
    );

    return rows[0] ? toAdminSettings(rows[0]) : fallback();
  },
  async update(patch) {
    const user = authLocalRepository.getCurrentUser();
    const current = await this.get();
    const updatedAt = new Date().toISOString();
    const next: AdminSettings = {
      ...current,
      ...patch,
      id: SETTINGS_ID,
      updated_at: updatedAt,
      updated_by: user?.name ?? current.updated_by ?? "",
      remote_updated_at: updatedAt,
      pending_sync: true,
      sync_status: "pending",
    };
    const db = await getDb();

    await db.execute(
      `
        INSERT INTO admin_settings (
          id,
          admin_email,
          admin_whatsapp,
          updated_at,
          updated_by,
          remote_updated_at,
          pending_sync,
          sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          admin_email = excluded.admin_email,
          admin_whatsapp = excluded.admin_whatsapp,
          updated_at = excluded.updated_at,
          updated_by = excluded.updated_by,
          remote_updated_at = excluded.remote_updated_at,
          pending_sync = excluded.pending_sync,
          sync_status = excluded.sync_status
      `,
      [
        next.id,
        next.admin_email,
        next.admin_whatsapp,
        next.updated_at,
        next.updated_by ?? "",
        next.remote_updated_at ?? null,
        1,
        next.sync_status,
      ],
    );

    await activityLogSQLiteRepository.create({
      user_id: user?.id ?? "",
      user_name: user?.name ?? "-",
      action_type: "settings_update",
      description: "Mise à jour des paramètres administrateur",
      entity_type: "settings",
      entity_id: SETTINGS_ID,
    });
  },
};
