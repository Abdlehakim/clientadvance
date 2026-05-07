import type { NotificationDeliveryMode, NotificationItem } from "@/domain/types";
import { hasSmtpConfiguration, readNotificationDeliveryMode } from "@/infrastructure/local/adminSettingsState";
import { getStoredSmtpPassword } from "@/infrastructure/local/smtpPasswordStorage";
import { sendDesktopEmail } from "@/infrastructure/local/sqlite/desktopEmailClient";
import {
  getAdminSettings,
  getNotifications,
  initializeStorageDriver,
  isOnline,
  notificationService,
  useSQLiteStorage,
} from "./appServices";

const MISSING_SMTP_MESSAGE =
  "Paramètres SMTP manquants. Veuillez les configurer dans l’espace administrateur.";
const DESKTOP_EMAIL_UNAVAILABLE_MESSAGE =
  "Email direct depuis l’application indisponible hors application desktop.";

export interface NotificationDeliveryResult {
  mode: NotificationDeliveryMode;
  attempted: boolean;
  usedDesktopEmail: boolean;
  offline: boolean;
  backendRequired: boolean;
  sentCount: number;
  failedCount: number;
  whatsappDeferredCount: number;
  remainingCount: number;
  errorMessages: string[];
}

interface NotificationDeliveryOptions {
  backendAvailable: boolean;
}

function emptyResult(mode: NotificationDeliveryMode): NotificationDeliveryResult {
  return {
    mode,
    attempted: false,
    usedDesktopEmail: false,
    offline: false,
    backendRequired: false,
    sentCount: 0,
    failedCount: 0,
    whatsappDeferredCount: 0,
    remainingCount: 0,
    errorMessages: [],
  };
}

function shouldRetryNotification(notification: NotificationItem) {
  return notification.status !== "sent";
}

function readCurrentNotifications() {
  return Promise.resolve(getNotifications());
}

async function markNotificationAsSent(id: string) {
  await Promise.resolve(notificationService.markAsSent(id));
}

async function markNotificationAsFailed(id: string, errorMessage: string) {
  await Promise.resolve(notificationService.markAsFailed(id, errorMessage));
}

async function readRemainingNotificationCount() {
  const notifications = await readCurrentNotifications();
  return notifications.filter(shouldRetryNotification).length;
}

export async function deliverQueuedNotifications(
  options: NotificationDeliveryOptions,
): Promise<NotificationDeliveryResult> {
  await initializeStorageDriver().catch(() => null);

  const settings = getAdminSettings();
  const mode = readNotificationDeliveryMode(settings.notification_delivery_mode);
  const result = emptyResult(mode);
  const notifications = (await readCurrentNotifications()).filter(shouldRetryNotification);

  result.remainingCount = notifications.length;

  if (notifications.length === 0) {
    return result;
  }

  if (!isOnline()) {
    result.offline = true;
    result.backendRequired = notifications.some((notification) => notification.type === "whatsapp");
    return result;
  }

  const shouldUseDesktopEmail =
    mode === "desktop-email" || (mode === "hybrid-email" && !options.backendAvailable);

  if (!shouldUseDesktopEmail) {
    result.backendRequired = notifications.length > 0;
    result.whatsappDeferredCount = notifications.filter(
      (notification) => notification.type === "whatsapp",
    ).length;
    return result;
  }

  const emailNotifications = notifications.filter((notification) => notification.type === "email");
  result.whatsappDeferredCount = notifications.filter(
    (notification) => notification.type === "whatsapp",
  ).length;
  result.backendRequired = result.whatsappDeferredCount > 0;

  if (emailNotifications.length === 0) {
    result.remainingCount = await readRemainingNotificationCount();
    return result;
  }

  result.attempted = true;
  result.usedDesktopEmail = true;

  if (!useSQLiteStorage) {
    result.failedCount = emailNotifications.length;
    result.errorMessages.push(DESKTOP_EMAIL_UNAVAILABLE_MESSAGE);
    return result;
  }

  const smtpPassword = await getStoredSmtpPassword();
  const smtpPasswordConfigured =
    settings.smtp_password_configured || smtpPassword.trim().length > 0;

  if (
    !hasSmtpConfiguration({
      ...settings,
      smtp_password_configured: smtpPasswordConfigured,
    }) ||
    smtpPassword.trim().length === 0
  ) {
    for (const notification of emailNotifications) {
      await markNotificationAsFailed(notification.id, MISSING_SMTP_MESSAGE);
    }

    result.failedCount = emailNotifications.length;
    result.errorMessages.push(MISSING_SMTP_MESSAGE);
    result.remainingCount = await readRemainingNotificationCount();
    return result;
  }

  for (const notification of emailNotifications) {
    try {
      await sendDesktopEmail({
        host: settings.smtp_host,
        port: settings.smtp_port,
        username: settings.smtp_username,
        password: smtpPassword,
        secure: settings.smtp_secure,
        fromEmail: settings.smtp_from_email,
        fromName: settings.smtp_from_name,
        to: notification.recipient,
        subject: notification.subject,
        body: notification.body,
      });
      await markNotificationAsSent(notification.id);
      result.sentCount += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Échec d’envoi email";
      await markNotificationAsFailed(notification.id, message);
      result.failedCount += 1;
      result.errorMessages.push(message);
    }
  }

  result.remainingCount = await readRemainingNotificationCount();
  return result;
}
