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
import { paymentLocalRepository } from "@/infrastructure/local/paymentLocalRepository";
import { adminSettingsLocalRepository } from "@/infrastructure/local/adminSettingsLocalRepository";
import { activityLogLocalRepository } from "@/infrastructure/local/activityLogLocalRepository";
import { notificationLocalRepository } from "@/infrastructure/local/notificationLocalRepository";
import {
  isTauriRuntime,
} from "@/infrastructure/local/sqlite/sqliteClient";
import { authRemoteRepository } from "@/infrastructure/remote/authRemoteRepository";
import { userRemoteService } from "@/infrastructure/remote/userRemoteService";
import { syncService as defaultSyncService } from "@/infrastructure/sync/syncService";
import { seedIfNeeded } from "@/infrastructure/local/localStorageDatabase";
import { isConnectionOnline, setConnectionTestOverride } from "./connectionService";
import {
  createSqliteCachedSyncService,
  initializeSqliteCache,
  sqliteCachedActivityLogService,
  sqliteCachedAdminSettingsService,
  sqliteCachedClientService,
  sqliteCachedNotificationService,
  sqliteCachedPaymentService,
} from "./sqliteCachedServices";

const useLocalAuth = import.meta.env.VITE_USE_LOCAL_AUTH === "true";
export type StorageDriver = "localStorage" | "sqlite";
export const storageDriver: StorageDriver =
  import.meta.env.VITE_STORAGE_DRIVER === "sqlite" ? "sqlite" : "localStorage";
export const useSQLiteStorage = storageDriver === "sqlite" && isTauriRuntime();

export const authService = useLocalAuth ? authLocalRepository : authRemoteRepository;
const sqliteSyncService = createSqliteCachedSyncService(defaultSyncService);

// Browser/dev mode stays on localStorage by default.
// Desktop mode enables SQLite only when VITE_STORAGE_DRIVER=sqlite and the app runs inside Tauri.
// The SQLite path uses an in-memory cache because the current React UI still reads data synchronously.
export const clientService = useSQLiteStorage ? sqliteCachedClientService : clientLocalRepository;
export const paymentService = useSQLiteStorage ? sqliteCachedPaymentService : paymentLocalRepository;
export const adminSettingsService = useSQLiteStorage
  ? sqliteCachedAdminSettingsService
  : adminSettingsLocalRepository;
export const activityLogService = useSQLiteStorage
  ? sqliteCachedActivityLogService
  : activityLogLocalRepository;
export const notificationService = useSQLiteStorage
  ? sqliteCachedNotificationService
  : notificationLocalRepository;
export const syncService = useSQLiteStorage ? sqliteSyncService : defaultSyncService;

if (useSQLiteStorage) {
  void initializeSqliteCache().catch((error) => {
    console.error("SQLite storage initialization failed.", error);
  });
}

export { seedIfNeeded };
export { formatTND, formatDateFR, formatDateTimeFR } from "@/lib/format";

export async function initializeStorageDriver() {
  if (!useSQLiteStorage) {
    return null;
  }

  await initializeSqliteCache();
  return true;
}

import type {
  ActivityLog,
  Client,
  ClientCreateInput,
  ClientUpdateInput,
  Payment,
  PaymentCreateInput,
  AdminSettings,
  AdminSettingsUpdateInput,
  EmployeeAccount,
  EmployeeAccountCreateInput,
  EmployeeAccountUpdateInput,
  NotificationItem,
} from "@/domain/types";

export const getCurrentUser = () => authService.getCurrentUser();
export const login = (email: string, password: string) => authService.login(email, password);
export const logout = () => authService.logout();

export const getClients = () => clientService.getAll() as Client[];
export const getClient = (id: string) => clientService.getById(id) as Client | null;
export const createClient = (input: ClientCreateInput) => clientService.create(input);
export const updateClient = (id: string, patch: ClientUpdateInput) => {
  void clientService.update(id, patch);
};
export const deleteClient = (id: string) => {
  void clientService.delete(id);
};

export const getPayments = () => paymentService.getAll() as Payment[];
export const getPaymentsByClient = (id: string) => paymentService.getByClientId(id) as Payment[];
export const createPayment = (input: PaymentCreateInput) => paymentService.create(input);

export const getAdminSettings = () => adminSettingsService.get() as AdminSettings;
export const updateAdminSettings = (patch: AdminSettingsUpdateInput) => {
  void adminSettingsService.update(patch);
};

export const getActivityLogs = () => activityLogService.getAll() as ActivityLog[];
export const getNotifications = () => notificationService.getAll() as NotificationItem[];

function ensureBackendUserManagementAvailable() {
  if (useLocalAuth) {
    throw new Error("Gestion des employés indisponible en mode démo local.");
  }
}

export const getEmployeeAccounts = async () => {
  ensureBackendUserManagementAvailable();
  return userRemoteService.list() as Promise<EmployeeAccount[]>;
};

export const createEmployeeAccount = async (input: EmployeeAccountCreateInput) => {
  ensureBackendUserManagementAvailable();
  return userRemoteService.create(input) as Promise<EmployeeAccount>;
};

export const updateEmployeeAccount = async (id: string, patch: EmployeeAccountUpdateInput) => {
  ensureBackendUserManagementAvailable();
  return userRemoteService.update(id, patch) as Promise<EmployeeAccount>;
};

export const isOnline = () => isConnectionOnline();
export const setOnline = (v: boolean) => setConnectionTestOverride(v);
export const getLastSync = () => syncService.getLastSync();
export const getPendingCount = () => syncService.getPendingCount();
export const syncPendingData = () => syncService.syncPendingData();
