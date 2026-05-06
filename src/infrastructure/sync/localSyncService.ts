import type { SyncRepository } from "@/domain/repositories";
import type { ActivityLog, AdminSettings, Client, NotificationItem, Payment } from "@/domain/types";
import { KEYS, emitChange, isBrowser, read } from "../local/localStorageDatabase";
import { authLocalRepository } from "../local/authLocalRepository";

const isPendingSync = (item: { pending_sync?: boolean; sync_status?: string }) =>
  item.pending_sync === true || item.sync_status === "pending" || item.sync_status === "failed";

export const localSyncService: SyncRepository = {
  isOnlineMode() {
    return read<string>(KEYS.online, "true") === "true";
  },
  setOnlineMode(v) {
    if (!isBrowser()) return;
    localStorage.setItem(KEYS.online, String(v));
    emitChange();
  },
  getLastSync() {
    return read<string | null>(KEYS.lastSync, null);
  },
  getPendingCount() {
    const clients = read<Client[]>(KEYS.clients, []).filter(isPendingSync).length;
    const payments = read<Payment[]>(KEYS.payments, []).filter(isPendingSync).length;
    const settings = isPendingSync(read<AdminSettings>(KEYS.settings, { pending_sync: false } as AdminSettings)) ? 1 : 0;
    const logs = read<ActivityLog[]>(KEYS.logs, []).filter((log) => log.pending_sync !== false).length;
    const notifications = read<NotificationItem[]>(KEYS.notifications, []).filter(
      (notification) => isPendingSync(notification) || notification.status === "queued",
    ).length;
    return clients + payments + settings + logs + notifications;
  },
  syncPendingData() {
    if (!this.isOnlineMode()) return { ok: false, synced: 0 };
    let count = 0;

    const clients = read<Client[]>(KEYS.clients, []).map((client) =>
      isPendingSync(client) ? (count++, { ...client, pending_sync: false, sync_status: "synced" as const }) : client,
    );
    const payments = read<Payment[]>(KEYS.payments, []).map((payment) =>
      isPendingSync(payment)
        ? (count++, { ...payment, pending_sync: false, sync_status: "synced" as const })
        : payment,
    );
    const settings = read<AdminSettings>(KEYS.settings, { pending_sync: false } as AdminSettings);
    const nextSettings = isPendingSync(settings)
      ? { ...settings, pending_sync: false, sync_status: "synced" as const }
      : settings;
    if (isPendingSync(settings)) count++;

    const logs = read<ActivityLog[]>(KEYS.logs, []).map((log) =>
      log.pending_sync !== false ? (count++, { ...log, pending_sync: false, sync_status: "synced" as const }) : log,
    );
    const notifications = read<NotificationItem[]>(KEYS.notifications, []).map((notification) =>
      isPendingSync(notification) || notification.status === "queued"
        ? (count++, { ...notification, pending_sync: false, sync_status: "synced" as const })
        : notification,
    );

    if (isBrowser()) {
      localStorage.setItem(KEYS.clients, JSON.stringify(clients));
      localStorage.setItem(KEYS.payments, JSON.stringify(payments));
      localStorage.setItem(KEYS.settings, JSON.stringify(nextSettings));
      localStorage.setItem(KEYS.logs, JSON.stringify(logs));
      localStorage.setItem(KEYS.notifications, JSON.stringify(notifications));
      localStorage.setItem(KEYS.lastSync, new Date().toISOString());
    }

    emitChange();
    return { ok: true, synced: count };
  },
};