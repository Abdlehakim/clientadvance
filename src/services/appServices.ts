/**
 * Central service registry.
 *
 * The whole UI imports business operations from here only.
 * Switching to SQLite + remote API is a one-line change in this file.
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
