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
  totalPaid: number,
) {
  const deliveryMode = readNotificationDeliveryMode(
    settings.notification_delivery_mode,
    settings.server_mode,
  );
  const dateFr = formatDateFR(payment.date_paiement);
  const clientName = client?.nom_complet?.trim() ?? "";
  const displayClientName = clientName || "-";
  const currentPaymentAmount = formatTND(payment.montant);
  const totalPaidAmount = formatTND(totalPaid);
  const clientEmailBody = `${clientName ? `Bonjour ${clientName},` : "Bonjour,"}\n\nNous confirmons la reception de votre paiement.\n\nMontant paye : ${currentPaymentAmount}\nTotal paye a ce jour : ${totalPaidAmount}\n\nDate : ${dateFr}\nHeure : ${payment.heure_paiement}\n\nMerci.`;
  const adminEmailBody = `Bonjour,\n\nUn nouveau paiement a ete enregistre.\n\nClient : ${displayClientName}\nMontant du paiement : ${currentPaymentAmount}\nTotal paye par ce client : ${totalPaidAmount}\n\nDate : ${dateFr}\nHeure : ${payment.heure_paiement}\nEnregistre par : ${actorName}\n\nMerci.`;
  const waBody = `Paiement enregistre\n\nClient : ${displayClientName}\nMontant : ${currentPaymentAmount}\nDate : ${dateFr}\nHeure : ${payment.heure_paiement}\nEnregistre par : ${actorName}`;

  const notifications = [
    ...createNotification(
      client?.email
        ? {
            type: "email",
            recipient: client.email,
            subject: "Confirmation de paiement",
            body: clientEmailBody,
            payment_id: payment.id,
          }
        : null,
    ),
    ...createNotification({
      type: "email",
      recipient: settings.admin_email,
      subject: "Nouveau paiement enregistre",
      body: adminEmailBody,
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
