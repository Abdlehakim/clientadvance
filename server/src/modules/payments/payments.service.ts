import { prisma } from "../../config/prisma.js";
import { createId } from "../../utils/ids.js";
import { HttpError } from "../../utils/httpError.js";
import { createActivityLog } from "../activityLogs/activityLogs.service.js";
import { createNotificationQueueItem } from "../notifications/notifications.service.js";

interface Actor {
  id: string;
  name: string;
}

interface PaymentInput {
  id?: string;
  client_id: string;
  montant: number;
  date_paiement: string;
  heure_paiement: string;
  created_by?: string;
  created_at?: string;
  remote_updated_at?: string;
}

function serialize(payment: {
  id: string;
  clientId: string;
  montant: { toNumber(): number };
  datePaiement: string;
  heurePaiement: string;
  createdBy: string | null;
  createdAt: Date;
  remoteUpdatedAt: Date;
}) {
  return {
    id: payment.id,
    client_id: payment.clientId,
    montant: payment.montant.toNumber(),
    date_paiement: payment.datePaiement,
    heure_paiement: payment.heurePaiement,
    created_by: payment.createdBy ?? "",
    created_at: payment.createdAt.toISOString(),
    remote_updated_at: payment.remoteUpdatedAt.toISOString(),
    pending_sync: false,
    sync_status: "synced" as const,
  };
}

export async function listPayments() {
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
  });

  return payments.map(serialize);
}

export async function getPaymentsByClientId(clientId: string) {
  const payments = await prisma.payment.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  });

  return payments.map(serialize);
}

export async function createPayment(input: PaymentInput, actor: Actor) {
  const client = await prisma.client.findFirst({
    where: { id: input.client_id, deletedAt: null },
  });

  if (!client) {
    throw new HttpError(404, "Client introuvable");
  }

  const now = new Date();
  const payment = await prisma.payment.create({
    data: {
      id: input.id ?? createId("payment"),
      clientId: input.client_id,
      montant: input.montant,
      datePaiement: input.date_paiement,
      heurePaiement: input.heure_paiement,
      createdBy: input.created_by ?? actor.id,
      createdAt: input.created_at ? new Date(input.created_at) : now,
      remoteUpdatedAt: input.remote_updated_at ? new Date(input.remote_updated_at) : now,
    },
  });

  const settings = await prisma.adminSettings.findUnique({ where: { id: "settings_default" } });
  const montantTexte = `${payment.montant.toString()} TND`;
  const body = `Paiement enregistré pour ${client.nomComplet} - Montant: ${montantTexte} - Date: ${payment.datePaiement} ${payment.heurePaiement}`;

  if (settings?.adminEmail) {
    await createNotificationQueueItem(
      {
        type: "email",
        recipient: settings.adminEmail,
        subject: "Nouveau paiement enregistré",
        body,
        payment_id: payment.id,
      },
      actor,
    );
  }

  if (settings?.adminWhatsapp) {
    await createNotificationQueueItem(
      {
        type: "whatsapp",
        recipient: settings.adminWhatsapp,
        subject: "Paiement",
        body,
        payment_id: payment.id,
      },
      actor,
    );
  }

  if (client.email) {
    await createNotificationQueueItem(
      {
        type: "email",
        recipient: client.email,
        subject: "Confirmation de paiement",
        body,
        payment_id: payment.id,
      },
      actor,
    );
  }

  if (client.telephone) {
    await createNotificationQueueItem(
      {
        type: "whatsapp",
        recipient: client.telephone,
        subject: "Paiement",
        body,
        payment_id: payment.id,
      },
      actor,
    );
  }

  await createActivityLog({
    userId: actor.id,
    userName: actor.name,
    actionType: "payment_create",
    description: `Paiement de ${montantTexte} pour ${client.nomComplet}`,
    entityType: "payment",
    entityId: payment.id,
  });

  return serialize(payment);
}