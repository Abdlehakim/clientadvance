/**
 * Central service registry — the single entry point used by the UI.
 *
 * Authentication can now switch between the local demo adapter and the real
 * backend via `VITE_USE_LOCAL_AUTH`.
 *
 * All CRUD services remain local/offline-first.
 * Manual sync switches to the backend sync API when backend auth is enabled.
 */
import { authLocalRepository } from "@/infrastructure/local/authLocalRepository";
import { clientLocalRepository } from "@/infrastructure/local/clientLocalRepository";
import { clientSQLiteRepository } from "@/infrastructure/local/sqlite/clientSQLiteRepository";
import { paymentLocalRepository } from "@/infrastructure/local/paymentLocalRepository";
import { paymentSQLiteRepository } from "@/infrastructure/local/sqlite/paymentSQLiteRepository";
import { adminSettingsLocalRepository } from "@/infrastructure/local/adminSettingsLocalRepository";
import { adminSettingsSQLiteRepository } from "@/infrastructure/local/sqlite/adminSettingsSQLiteRepository";
import { activityLogLocalRepository } from "@/infrastructure/local/activityLogLocalRepository";
import { notificationLocalRepository } from "@/infrastructure/local/notificationLocalRepository";
import {
  initializeSqliteDatabase,
  isTauriRuntime,
} from "@/infrastructure/local/sqlite/sqliteClient";
import { authRemoteRepository } from "@/infrastructure/remote/authRemoteRepository";
import { syncService as defaultSyncService } from "@/infrastructure/sync/syncService";
import { seedIfNeeded } from "@/infrastructure/local/localStorageDatabase";
import { isConnectionOnline, setConnectionTestOverride } from "./connectionService";

const useLocalAuth = import.meta.env.VITE_USE_LOCAL_AUTH === "true";
export type StorageDriver = "localStorage" | "sqlite";
export const storageDriver: StorageDriver =
  import.meta.env.VITE_STORAGE_DRIVER === "sqlite" ? "sqlite" : "localStorage";

export const authService = useLocalAuth ? authLocalRepository : authRemoteRepository;
export const sqliteClientRepositoryCandidate =
  storageDriver === "sqlite" && isTauriRuntime() ? clientSQLiteRepository : null;
export const paymentSQLiteRepositoryCandidate =
  storageDriver === "sqlite" && isTauriRuntime() ? paymentSQLiteRepository : null;
export const adminSettingsSQLiteRepositoryCandidate =
  storageDriver === "sqlite" && isTauriRuntime() ? adminSettingsSQLiteRepository : null;

// Keep localStorage active until the UI service facade is made async-safe.
// When the rest of the app is ready for Promise-based repositories, switch to:
// export const clientService = sqliteClientRepositoryCandidate ?? clientLocalRepository;
export const clientService = clientLocalRepository;
// Keep localStorage active until the UI service facade is made async-safe.
// When the rest of the app is ready for Promise-based repositories, switch to:
// export const paymentService = paymentSQLiteRepositoryCandidate ?? paymentLocalRepository;
export const paymentService = paymentLocalRepository;
// Keep localStorage active until the UI service facade is made async-safe.
// When the rest of the app is ready for Promise-based repositories, switch to:
// export const adminSettingsService =
//   adminSettingsSQLiteRepositoryCandidate ?? adminSettingsLocalRepository;
export const adminSettingsService = adminSettingsLocalRepository;
export const activityLogService = activityLogLocalRepository;
export const notificationService = notificationLocalRepository;
export const syncService = defaultSyncService;

export { seedIfNeeded };
export { formatTND, formatDateFR, formatDateTimeFR } from "@/lib/format";

export async function initializeStorageDriver() {
  if (storageDriver !== "sqlite" || !isTauriRuntime()) {
    return null;
  }

  return initializeSqliteDatabase();
}

import type {
  Client,
  ClientCreateInput,
  ClientUpdateInput,
  Payment,
  PaymentCreateInput,
  AdminSettings,
  AdminSettingsUpdateInput,
} from "@/domain/types";

export const getCurrentUser = () => authService.getCurrentUser();
export const login = (email: string, password: string) => authService.login(email, password);
export const logout = () => authService.logout();

export const getClients = () => clientService.getAll() as Client[];
export const getClient = (id: string) => clientService.getById(id) as Client | null;
export const createClient = (input: ClientCreateInput) => clientService.create(input) as Client;
export const updateClient = (id: string, patch: ClientUpdateInput) => {
  void clientService.update(id, patch);
};
export const deleteClient = (id: string) => {
  void clientService.delete(id);
};

export const getPayments = () => paymentService.getAll() as Payment[];
export const getPaymentsByClient = (id: string) => paymentService.getByClientId(id) as Payment[];
export const createPayment = (input: PaymentCreateInput) => paymentService.create(input) as Payment;

export const getAdminSettings = () => adminSettingsService.get() as AdminSettings;
export const updateAdminSettings = (patch: AdminSettingsUpdateInput) => {
  void adminSettingsService.update(patch);
};

import type { ActivityLog, NotificationItem } from "@/domain/types";
export const getActivityLogs = () => activityLogService.getAll() as ActivityLog[];
export const getNotifications = () => notificationService.getAll() as NotificationItem[];

export const isOnline = () => isConnectionOnline();
export const setOnline = (v: boolean) => setConnectionTestOverride(v);
export const getLastSync = () => syncService.getLastSync();
export const getPendingCount = () => syncService.getPendingCount();
export const syncPendingData = () => syncService.syncPendingData();
