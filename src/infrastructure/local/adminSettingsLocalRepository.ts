import type { AdminSettingsRepository } from "@/domain/repositories";
import type { AdminSettings } from "@/domain/types";
import { KEYS, read, write } from "./localStorageDatabase";
import { authLocalRepository } from "./authLocalRepository";
import { activityLogLocalRepository } from "./activityLogLocalRepository";

const fallback = (): AdminSettings => ({
  id: "settings_default",
  admin_email: "",
  admin_whatsapp: "",
  updated_at: new Date().toISOString(),
  updated_by: "",
  pending_sync: false,
  sync_status: "synced",
});

export const adminSettingsLocalRepository: AdminSettingsRepository = {
  get() {
    return read<AdminSettings>(KEYS.settings, fallback());
  },
  update(patch) {
    const user = authLocalRepository.getCurrentUser();
    const current = read<AdminSettings>(KEYS.settings, fallback());
    const updatedAt = new Date().toISOString();
    const next: AdminSettings = {
      ...current,
      ...patch,
      id: "settings_default",
      updated_at: updatedAt,
      updated_by: user?.name ?? current.updated_by ?? "",
      remote_updated_at: updatedAt,
      pending_sync: true,
      sync_status: "pending",
    };

    write(KEYS.settings, next);
    activityLogLocalRepository.create({
      user_id: user?.id ?? "",
      user_name: user?.name ?? "—",
      action_type: "settings_update",
      description: "Mise à jour des paramètres administrateur",
      entity_type: "settings",
      entity_id: next.id,
    });
  },
};
