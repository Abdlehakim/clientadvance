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
  "Paramètres SMTP manquants. Veuillez les configurer dans l'espace administrateur.";
const DESKTOP_EMAIL_UNAVAILABLE_MESSAGE =
  "Email direct depuis l'application indisponible hors application desktop.";
const GMAIL_SMTP_HOST = "smtp.gmail.com";
const GMAIL_SMTP_PORT = 587;
const GMAIL_APP_PASSWORD_HINT =
  "Pour Gmail, utilisez un mot de passe d'application, pas le mot de passe normal du compte Gmail.";

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

async function readRemainingEmailNotificationCount() {
  const notifications = await readCurrentNotifications();
  return notifications.filter(
    (notification) =>
      notification.type === "email" && shouldRetryNotification(notification),
  ).length;
}

function resolveDesktopEmailConfig(
  settings: ReturnType<typeof getAdminSettings>,
  smtpPassword: string,
) {
  const isGmail = settings.smtp_provider_type === "gmail";
  const host = isGmail ? GMAIL_SMTP_HOST : settings.smtp_host.trim();
  const port = isGmail ? GMAIL_SMTP_PORT : settings.smtp_port;
  const username = settings.smtp_username.trim();
  const fromEmail = isGmail
    ? settings.smtp_from_email.trim() || username
    : settings.smtp_from_email.trim();
  const secure = isGmail ? true : settings.smtp_secure;
  const smtpPasswordConfigured =
    settings.smtp_password_configured || smtpPassword.trim().length > 0;

  if (
    !hasSmtpConfiguration({
      ...settings,
      smtp_host: host,
      smtp_port: port,
      smtp_username: username,
      smtp_from_email: fromEmail,
      smtp_secure: secure,
      smtp_password_configured: smtpPasswordConfigured,
    }) ||
    smtpPassword.trim().length === 0
  ) {
    return null;
  }

  return {
    host,
    port,
    username,
    password: smtpPassword,
    secure,
    fromEmail,
    fromName: settings.smtp_from_name,
  };
}

function decorateDesktopEmailError(
  message: string,
  settings: ReturnType<typeof getAdminSettings>,
) {
  if (
    settings.smtp_provider_type === "gmail" &&
    /(auth|authentication|credential|password|username|535)/i.test(message) &&
    !message.includes(GMAIL_APP_PASSWORD_HINT)
  ) {
    return `${message} ${GMAIL_APP_PASSWORD_HINT}`;
  }

  return message;
}

export async function deliverQueuedNotifications(
  options: NotificationDeliveryOptions,
): Promise<NotificationDeliveryResult> {
  await initializeStorageDriver().catch(() => null);

  const settings = getAdminSettings();
  const mode = readNotificationDeliveryMode(
    settings.notification_delivery_mode,
    settings.server_mode,
  );
  const result = emptyResult(mode);
  const shouldUseDesktopEmail = mode === "desktop-email";
  const allRetryableNotifications = (await readCurrentNotifications()).filter(
    shouldRetryNotification,
  );
  const notifications = shouldUseDesktopEmail
    ? allRetryableNotifications.filter((notification) => notification.type === "email")
    : allRetryableNotifications;

  result.remainingCount = notifications.length;

  if (notifications.length === 0) {
    return result;
  }

  if (!isOnline()) {
    result.offline = true;
    result.backendRequired =
      !shouldUseDesktopEmail &&
      notifications.some((notification) => notification.type === "whatsapp");
    return result;
  }

  if (!shouldUseDesktopEmail) {
    result.backendRequired = notifications.length > 0;
    result.whatsappDeferredCount = notifications.filter(
      (notification) => notification.type === "whatsapp",
    ).length;
    return result;
  }

  const emailNotifications = notifications;
  result.attempted = true;
  result.usedDesktopEmail = true;
  result.whatsappDeferredCount = 0;
  result.backendRequired = false;

  if (!useSQLiteStorage) {
    for (const notification of emailNotifications) {
      await markNotificationAsFailed(notification.id, DESKTOP_EMAIL_UNAVAILABLE_MESSAGE);
    }

    result.failedCount = emailNotifications.length;
    result.errorMessages.push(DESKTOP_EMAIL_UNAVAILABLE_MESSAGE);
    result.remainingCount = await readRemainingEmailNotificationCount();
    return result;
  }

  const smtpPassword = await getStoredSmtpPassword();
  const smtpConfig = resolveDesktopEmailConfig(settings, smtpPassword);

  if (!smtpConfig) {
    for (const notification of emailNotifications) {
      await markNotificationAsFailed(notification.id, MISSING_SMTP_MESSAGE);
    }

    result.failedCount = emailNotifications.length;
    result.errorMessages.push(MISSING_SMTP_MESSAGE);
    result.remainingCount = await readRemainingEmailNotificationCount();
    return result;
  }

  for (const notification of emailNotifications) {
    try {
      await sendDesktopEmail({
        host: smtpConfig.host,
        port: smtpConfig.port,
        username: smtpConfig.username,
        password: smtpConfig.password,
        secure: smtpConfig.secure,
        fromEmail: smtpConfig.fromEmail,
        fromName: smtpConfig.fromName,
        to: notification.recipient,
        subject: notification.subject,
        body: notification.body,
      });
      await markNotificationAsSent(notification.id);
      result.sentCount += 1;
    } catch (error) {
      const message = decorateDesktopEmailError(
        error instanceof Error ? error.message : "Echec d'envoi email",
        settings,
      );
      await markNotificationAsFailed(notification.id, message);
      result.failedCount += 1;
      result.errorMessages.push(message);
    }
  }

  result.remainingCount = await readRemainingEmailNotificationCount();
  return result;
}
