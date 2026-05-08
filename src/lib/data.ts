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
  getAllClients, getClients, getClient, getClientReferenceById, createClient, updateClient, deleteClient,
  getPayments, getPaymentsByClient, createPayment, getLocalSyncStatus, getServerSyncStatus, getPaymentNotificationStatusMap, getPaymentNotificationStatuses,
  getAdminSettings, updateAdminSettings,
  testAdminSmtpEmail,
  changeLocalDatabaseLocation, chooseLocalDatabaseFolder, getLocalDatabaseLocation, openLocalDatabaseLocation,
  getActivityLogs, getNotifications,
  cleanupOldSentNotifications, clearSentNotifications,
  getEmployeeAccounts, createEmployeeAccount, updateEmployeeAccount,
  isAdmin, isEmployee, isSameLocalDay, filterForCurrentUserDailyScope,
  isOnline, setOnline, getLastSync, getPendingCount, syncPendingData,
  resetDevelopmentTestData,
  formatTND, formatDateFR, formatDateTimeFR,
} from "@/services/appServices";

export { DEMO_USERS as USERS } from "@/infrastructure/local/authLocalRepository";
