import type { PaymentRepository } from "@/domain/repositories";
import type { Payment, AdminSettings, Client } from "@/domain/types";
import { KEYS, read, uid, write } from "./localStorageDatabase";
import { authLocalRepository } from "./authLocalRepository";
import { activityLogLocalRepository } from "./activityLogLocalRepository";
import { clientLocalRepository } from "./clientLocalRepository";
import { adminSettingsLocalRepository } from "./adminSettingsLocalRepository";
import { notificationLocalRepository } from "./notificationLocalRepository";
import { formatDateFR, formatTND } from "@/lib/format";

const list = () => read<Payment[]>(KEYS.payments, []);

type PaymentClient = Client & { nom_complet?: string; email?: string; telephone?: string };

export const paymentLocalRepository: PaymentRepository = {
  getAll() {
    return list();
  },
  getByClientId(clientId) {
    return list().filter((payment) => payment.client_id === clientId);
  },
  create(input) {
    const user = authLocalRepository.getCurrentUser();
    const now = new Date().toISOString();
    const payment: Payment = {
      ...input,
      id: uid(),
      created_by: user?.name ?? "—",
      created_at: now,
      remote_updated_at: now,
      pending_sync: true,
      sync_status: "pending",
    };

    write(KEYS.payments, [payment, ...list()]);

    const client = clientLocalRepository.getById(payment.client_id) as PaymentClient | null;
    activityLogLocalRepository.create({
      user_id: user?.id ?? "",
      user_name: user?.name ?? "—",
      action_type: "payment_create",
      description: `Paiement de ${formatTND(payment.montant)} pour ${client?.nom_complet ?? "—"}`,
      entity_type: "payment",
      entity_id: payment.id,
    });

    const settings = adminSettingsLocalRepository.get() as AdminSettings;
    const dateFr = formatDateFR(payment.date_paiement);
    const emailBody = `Bonjour,\n\nUn paiement a été enregistré.\n\nClient : ${client?.nom_complet}\nMontant : ${formatTND(payment.montant)}\nDate : ${dateFr}\nHeure : ${payment.heure_paiement}\nEnregistré par : ${user?.name}\n\nMerci.`;
    const waBody = `Paiement enregistré\n\nClient : ${client?.nom_complet}\nMontant : ${formatTND(payment.montant)}\nDate : ${dateFr}\nHeure : ${payment.heure_paiement}\nEnregistré par : ${user?.name}`;

    notificationLocalRepository.create({
      type: "email",
      recipient: settings.admin_email,
      subject: "Nouveau paiement enregistré",
      body: emailBody,
      payment_id: payment.id,
    });
    notificationLocalRepository.create({
      type: "whatsapp",
      recipient: settings.admin_whatsapp,
      subject: "Paiement",
      body: waBody,
      payment_id: payment.id,
    });
    if (client?.email) {
      notificationLocalRepository.create({
        type: "email",
        recipient: client.email,
        subject: "Confirmation de paiement",
        body: emailBody,
        payment_id: payment.id,
      });
    }
    if (client?.telephone) {
      notificationLocalRepository.create({
        type: "whatsapp",
        recipient: client.telephone,
        subject: "Paiement",
        body: waBody,
        payment_id: payment.id,
      });
    }

    return payment;
  },
};