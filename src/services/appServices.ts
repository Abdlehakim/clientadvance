/**
 * Central service registry — the single entry point used by the UI.
 *
 * Authentication can now switch between the local demo adapter and the real
 * backend via `VITE_USE_LOCAL_AUTH`.
 *
 * All CRUD services remain local/offline-first.
 * Manual sync switches to the backend sync API when backend auth is enabled.
 */
import {
  createLocalEmployeeAccount,
  initializeOfflineAuthStorage,
  listLocalEmployeeAccounts,
  updateLocalEmployeeAccount as updateStoredLocalEmployeeAccount,
  upsertLocalEmployeeAccount,
} from "@/infrastructure/auth/offlineAuthStorage";
import { authLocalRepository } from "@/infrastructure/local/authLocalRepository";
import { clientLocalRepository } from "@/infrastructure/local/clientLocalRepository";
import { paymentLocalRepository } from "@/infrastructure/local/paymentLocalRepository";
import { adminSettingsLocalRepository } from "@/infrastructure/local/adminSettingsLocalRepository";
import { activityLogLocalRepository } from "@/infrastructure/local/activityLogLocalRepository";
import { notificationLocalRepository } from "@/infrastructure/local/notificationLocalRepository";
import {
  BACKEND_SYNC_DISABLED_MESSAGE,
  isBackendSyncEnabled,
} from "@/infrastructure/local/adminSettingsState";
import {
  isTauriRuntime,
} from "@/infrastructure/local/sqlite/sqliteClient";
import { ApiError } from "@/infrastructure/remote/apiClient";
import { authRemoteRepository } from "@/infrastructure/remote/authRemoteRepository";
import { userRemoteService } from "@/infrastructure/remote/userRemoteService";
import { syncService as defaultSyncService } from "@/infrastructure/sync/syncService";
import { seedIfNeeded as seedLocalStorageIfNeeded } from "@/infrastructure/local/localStorageDatabase";
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
const baseSyncService = useSQLiteStorage ? sqliteSyncService : defaultSyncService;

export { formatTND, formatDateFR, formatDateTimeFR } from "@/lib/format";

export function seedIfNeeded() {
  if (useSQLiteStorage) {
    return;
  }

  seedLocalStorageIfNeeded();
}

let storageDriverInitializationPromise: Promise<true | null> | null = null;

export async function initializeStorageDriver() {
  storageDriverInitializationPromise ??= (async () => {
    await initializeOfflineAuthStorage();

    if (!useSQLiteStorage) {
      return null;
    }

    await initializeSqliteCache();
    return true;
  })().catch((error) => {
    storageDriverInitializationPromise = null;
    throw error;
  });

  return storageDriverInitializationPromise;
}

if (typeof window !== "undefined") {
  void initializeStorageDriver().catch((error) => {
    console.error("Storage initialization failed.", error);
  });
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
  EmployeeAccountListResult,
  EmployeeAccountUpdateInput,
  NotificationItem,
} from "@/domain/types";
import type { SyncRepository } from "@/domain/repositories";

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
export const getServerMode = () => getAdminSettings().server_mode;
export const isBackendSyncMode = () => isBackendSyncEnabled(getAdminSettings());
export const updateAdminSettings = (patch: AdminSettingsUpdateInput) =>
  adminSettingsService.update(patch);

export const syncService: SyncRepository = {
  getPendingCount() {
    return isBackendSyncMode() ? baseSyncService.getPendingCount() : 0;
  },
  syncPendingData() {
    if (!isBackendSyncMode()) {
      throw new Error(BACKEND_SYNC_DISABLED_MESSAGE);
    }

    return baseSyncService.syncPendingData();
  },
  getLastSync() {
    return baseSyncService.getLastSync();
  },
  setOnlineMode(value) {
    baseSyncService.setOnlineMode(value);
  },
  isOnlineMode() {
    return baseSyncService.isOnlineMode();
  },
};

export const getActivityLogs = () => activityLogService.getAll() as ActivityLog[];
export const getNotifications = () => notificationService.getAll() as NotificationItem[];

function usesServerModeForEmployees() {
  return getServerMode() === "with-server";
}

export const getEmployeeAccounts = async (): Promise<EmployeeAccountListResult> => {
  if (!usesServerModeForEmployees()) {
    return {
      employees: await listLocalEmployeeAccounts(),
      source: "local",
      serverUnavailable: false,
    };
  }

  try {
    const employees = await userRemoteService.list();
    await Promise.all(
      employees.map((employee) =>
        upsertLocalEmployeeAccount(employee, {
          sync_status: "synced",
          pending_sync: false,
        }),
      ),
    );

    return {
      employees,
      source: "backend",
      serverUnavailable: false,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 0) {
      return {
        employees: await listLocalEmployeeAccounts(),
        source: "local",
        serverUnavailable: true,
      };
    }

    throw error;
  }
};

export const createEmployeeAccount = async (
  input: EmployeeAccountCreateInput,
): Promise<EmployeeAccount> => {
  if (!usesServerModeForEmployees()) {
    return createLocalEmployeeAccount(input, {
      offline_enabled: true,
      sync_status: "local",
      pending_sync: false,
    });
  }

  try {
    const employee = await userRemoteService.create(input);

    await upsertLocalEmployeeAccount(employee, {
      password: input.password,
      offline_enabled: true,
      sync_status: "synced",
      pending_sync: false,
    });

    return employee;
  } catch (error) {
    if (error instanceof ApiError && error.status === 0) {
      throw new Error("Impossible de créer l’employé sur le serveur.");
    }

    throw error;
  }
};

export const updateEmployeeAccount = async (
  id: string,
  patch: EmployeeAccountUpdateInput,
): Promise<EmployeeAccount> => {
  if (!usesServerModeForEmployees()) {
    return updateStoredLocalEmployeeAccount(id, patch, {
      offline_enabled: patch.password !== undefined ? true : undefined,
      sync_status: "local",
      pending_sync: false,
    });
  }

  try {
    const employee = await userRemoteService.update(id, patch);
    await upsertLocalEmployeeAccount(employee, {
      password: patch.password,
      offline_enabled: patch.password !== undefined ? true : undefined,
      sync_status: "synced",
      pending_sync: false,
    });

    return employee;
  } catch (error) {
    if (error instanceof ApiError && error.status === 0) {
      throw new Error("Impossible de mettre à jour l’employé sur le serveur.");
    }

    throw error;
  }
};

export const isOnline = () => isConnectionOnline();
export const setOnline = (v: boolean) => setConnectionTestOverride(v);
export const getLastSync = () => syncService.getLastSync();
export const getPendingCount = () => syncService.getPendingCount();
export const syncPendingData = () => syncService.syncPendingData();
