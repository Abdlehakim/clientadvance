/**
 * Central service registry — the single entry point used by the UI.
 *
 * The whole UI imports business operations from here (or from the named
 * convenience helpers below). Switching from localStorage to SQLite + remote
 * API is a one-line change in this file.
 *
 * Today: localStorage adapters (browser preview).
 * Later: SQLite (Tauri) + remote Node.js API.
 */
import { authLocalRepository } from "@/infrastructure/local/authLocalRepository";
import { clientLocalRepository } from "@/infrastructure/local/clientLocalRepository";
import { paymentLocalRepository } from "@/infrastructure/local/paymentLocalRepository";
import { adminSettingsLocalRepository } from "@/infrastructure/local/adminSettingsLocalRepository";
import { activityLogLocalRepository } from "@/infrastructure/local/activityLogLocalRepository";
import { notificationLocalRepository } from "@/infrastructure/local/notificationLocalRepository";
import { syncService as defaultSyncService } from "@/infrastructure/sync/syncService";
import { seedIfNeeded } from "@/infrastructure/local/localStorageDatabase";

export const authService = authLocalRepository;
export const clientService = clientLocalRepository;
export const paymentService = paymentLocalRepository;
export const adminSettingsService = adminSettingsLocalRepository;
export const activityLogService = activityLogLocalRepository;
export const notificationService = notificationLocalRepository;
export const syncService = defaultSyncService;

export { seedIfNeeded };
export { formatTND, formatDateFR, formatDateTimeFR } from "@/lib/format";

/* ----- Convenience named helpers (synchronous: backed by local adapters) ---- */

import type {
  Client, ClientCreateInput, ClientUpdateInput,
  Payment, PaymentCreateInput,
  AdminSettings, AdminSettingsUpdateInput,
} from "@/domain/types";

export const getCurrentUser = () => authService.getCurrentUser();
export const login = (email: string, password: string) => authService.login(email, password) as ReturnType<typeof authLocalRepository.login>;
export const logout = () => authService.logout();

export const getClients = () => clientService.getAll() as Client[];
export const getClient = (id: string) => clientService.getById(id) as Client | null;
export const createClient = (input: ClientCreateInput) => clientService.create(input) as Client;
export const updateClient = (id: string, patch: ClientUpdateInput) => { void clientService.update(id, patch); };
export const deleteClient = (id: string) => { void clientService.delete(id); };

export const getPayments = () => paymentService.getAll() as Payment[];
export const getPaymentsByClient = (id: string) => paymentService.getByClientId(id) as Payment[];
export const createPayment = (input: PaymentCreateInput) => paymentService.create(input) as Payment;

export const getAdminSettings = () => adminSettingsService.get() as AdminSettings;
export const updateAdminSettings = (patch: AdminSettingsUpdateInput) => { void adminSettingsService.update(patch); };

import type { ActivityLog, NotificationItem } from "@/domain/types";
export const getActivityLogs = () => activityLogService.getAll() as ActivityLog[];
export const getNotifications = () => notificationService.getAll() as NotificationItem[];

export const isOnline = () => syncService.isOnlineMode();
export const setOnline = (v: boolean) => syncService.setOnlineMode(v);
export const getLastSync = () => syncService.getLastSync();
export const getPendingCount = () => syncService.getPendingCount();
export const syncPendingData = () => syncService.syncPendingData() as { ok: boolean; synced: number };
