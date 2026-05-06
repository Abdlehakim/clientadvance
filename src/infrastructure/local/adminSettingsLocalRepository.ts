import type { AdminSettingsRepository } from "@/domain/repositories";
import type { AdminSettings } from "@/domain/types";
import { KEYS, read, write } from "./localStorageDatabase";
import { authLocalRepository } from "./authLocalRepository";
import { activityLogLocalRepository } from "./activityLogLocalRepository";

const fallback = (): AdminSettings => ({
  id: "s1", admin_email: "", admin_whatsapp: "",
  updated_at: new Date().toISOString(),
  pending_sync: false, sync_status: "synced",
});

export const adminSettingsLocalRepository: AdminSettingsRepository = {
  get() { return read<AdminSettings>(KEYS.settings, fallback()); },
  update(patch) {
    const u = authLocalRepository.getCurrentUser();
    const current = read<AdminSettings>(KEYS.settings, fallback());
    const next: AdminSettings = {
      ...current, ...patch,
      updated_at: new Date().toISOString(),
      pending_sync: true, sync_status: "pending",
    };
    write(KEYS.settings, next);
    activityLogLocalRepository.create({
      user_id: u?.id ?? "", user_name: u?.name ?? "—",
      action_type: "settings_update",
      description: `Mise à jour des paramètres administrateur`,
      entity_type: "settings", entity_id: next.id,
    });
  },
};
