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
import { authRemoteRepository } from "@/infrastructure/remote/authRemoteRepository";
import { syncService as defaultSyncService } from "@/infrastructure/sync/syncService";
import { seedIfNeeded } from "@/infrastructure/local/localStorageDatabase";
import { isConnectionOnline, setConnectionTestOverride } from "./connectionService";

const useLocalAuth = import.meta.env.VITE_USE_LOCAL_AUTH === "true";

export const authService = useLocalAuth ? authLocalRepository : authRemoteRepository;
export const clientService = clientLocalRepository;
export const paymentService = paymentLocalRepository;
export const adminSettingsService = adminSettingsLocalRepository;
export const activityLogService = activityLogLocalRepository;
export const notificationService = notificationLocalRepository;
export const syncService = defaultSyncService;

export { seedIfNeeded };
export { formatTND, formatDateFR, formatDateTimeFR } from "@/lib/format";

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
