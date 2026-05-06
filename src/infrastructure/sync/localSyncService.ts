import type { SyncRepository } from "@/domain/repositories";
import type { AdminSettings, Client, Payment } from "@/domain/types";
import { KEYS, emitChange, isBrowser, read } from "../local/localStorageDatabase";
import { authLocalRepository } from "../local/authLocalRepository";
import { activityLogLocalRepository } from "../local/activityLogLocalRepository";

export const localSyncService: SyncRepository = {
  isOnlineMode() { return read<string>(KEYS.online, "true") === "true"; },
  setOnlineMode(v) {
    if (!isBrowser()) return;
    localStorage.setItem(KEYS.online, String(v));
    emitChange();
  },
  getLastSync() { return read<string | null>(KEYS.lastSync, null); },
  getPendingCount() {
    const c = read<Client[]>(KEYS.clients, []).filter((x) => x.pending_sync).length;
    const p = read<Payment[]>(KEYS.payments, []).filter((x) => x.pending_sync).length;
    const s = read<AdminSettings>(KEYS.settings, { pending_sync: false } as AdminSettings).pending_sync ? 1 : 0;
    return c + p + s;
  },
  syncPendingData() {
    if (!this.isOnlineMode()) return { ok: false, synced: 0 };
    const u = authLocalRepository.getCurrentUser();
    let count = 0;
    const clients = read<Client[]>(KEYS.clients, []).map((c) =>
      c.pending_sync ? (count++, { ...c, pending_sync: false, sync_status: "synced" as const }) : c,
    );
    const payments = read<Payment[]>(KEYS.payments, []).map((p) =>
      p.pending_sync ? (count++, { ...p, pending_sync: false, sync_status: "synced" as const }) : p,
    );
    const settings = read<AdminSettings>(KEYS.settings, { pending_sync: false } as AdminSettings);
    const newSettings = settings.pending_sync ? { ...settings, pending_sync: false, sync_status: "synced" as const } : settings;
    if (settings.pending_sync) count++;
    if (isBrowser()) {
      localStorage.setItem(KEYS.clients, JSON.stringify(clients));
      localStorage.setItem(KEYS.payments, JSON.stringify(payments));
      localStorage.setItem(KEYS.settings, JSON.stringify(newSettings));
      localStorage.setItem(KEYS.lastSync, new Date().toISOString());
    }
    activityLogLocalRepository.create({
      user_id: u?.id ?? "", user_name: u?.name ?? "—",
      action_type: "sync",
      description: `Synchronisation manuelle effectuée (${count} éléments)`,
      entity_type: "sync", entity_id: "-",
    });
    emitChange();
    return { ok: true, synced: count };
  },
};
