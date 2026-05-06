/** SQLite repository for admin settings (Tauri build) — placeholder. */
import type { AdminSettingsRepository } from "@/domain/repositories";

export const adminSettingsSQLiteRepository: AdminSettingsRepository = {
  get() { throw new Error("TODO: SELECT * FROM admin_settings LIMIT 1"); },
  update() { throw new Error("TODO: UPDATE admin_settings SET ..., pending_sync=1"); },
};
