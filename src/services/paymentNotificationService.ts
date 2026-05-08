import type {
  AdminSettings,
  Client,
  NotificationCreateInput,
  Payment,
} from "@/domain/types";
import { readNotificationDeliveryMode } from "@/infrastructure/local/adminSettingsState";
import { formatDateFR, formatTND } from "@/lib/format";

type PaymentNotificationClient = Pick<Client, "nom_complet" | "email" | "telephone"> | null;

function createNotification(
  input: NotificationCreateInput | null,
): NotificationCreateInput[] {
  if (!input || input.recipient.trim().length === 0) {
    return [];
  }

  return [input];
}

export function buildPaymentNotifications(
  payment: Payment,
  client: PaymentNotificationClient,
  settings: AdminSettings,
  actorName: string,
) {
  const deliveryMode = readNotificationDeliveryMode(
    settings.notification_delivery_mode,
    settings.server_mode,
  );
  const dateFr = formatDateFR(payment.date_paiement);
  const emailBody = `Bonjour,\n\nUn paiement a ete enregistre.\n\nClient : ${client?.nom_complet}\nMontant : ${formatTND(payment.montant)}\nDate : ${dateFr}\nHeure : ${payment.heure_paiement}\nEnregistre par : ${actorName}\n\nMerci.`;
  const waBody = `Paiement enregistre\n\nClient : ${client?.nom_complet}\nMontant : ${formatTND(payment.montant)}\nDate : ${dateFr}\nHeure : ${payment.heure_paiement}\nEnregistre par : ${actorName}`;

  const notifications = [
    ...createNotification(
      client?.email
        ? {
            type: "email",
            recipient: client.email,
            subject: "Confirmation de paiement",
            body: emailBody,
            payment_id: payment.id,
          }
        : null,
    ),
    ...createNotification({
      type: "email",
      recipient: settings.admin_email,
      subject: "Nouveau paiement enregistre",
      body: emailBody,
      payment_id: payment.id,
    }),
  ];

  if (deliveryMode !== "backend") {
    return notifications;
  }

  return [
    ...notifications,
    ...createNotification({
      type: "whatsapp",
      recipient: settings.admin_whatsapp,
      subject: "Paiement",
      body: waBody,
      payment_id: payment.id,
    }),
    ...createNotification(
      client?.telephone
        ? {
            type: "whatsapp",
            recipient: client.telephone,
            subject: "Paiement",
            body: waBody,
            payment_id: payment.id,
          }
        : null,
    ),
  ];
}
