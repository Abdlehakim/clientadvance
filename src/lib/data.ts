/**
 * Backwards-compatible facade.
 *
 * The real implementation now lives under `src/domain`, `src/infrastructure`,
 * and `src/services/appServices.ts`. UI code should progressively migrate to
 * `import { ... } from "@/services/appServices"`.
 */
export {
  authService, clientService, paymentService, adminSettingsService,
  activityLogService, notificationService, syncService, seedIfNeeded,
  getCurrentUser, login, logout,
  getClients, getClient, createClient, updateClient, deleteClient,
  getPayments, getPaymentsByClient, createPayment,
  getAdminSettings, updateAdminSettings,
  getActivityLogs, getNotifications,
  getEmployeeAccounts, createEmployeeAccount, updateEmployeeAccount,
  isOnline, setOnline, getLastSync, getPendingCount, syncPendingData,
  formatTND, formatDateFR, formatDateTimeFR,
} from "@/services/appServices";

export { DEMO_USERS as USERS } from "@/infrastructure/local/authLocalRepository";
