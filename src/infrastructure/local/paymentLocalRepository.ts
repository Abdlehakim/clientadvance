import type { PaymentRepository } from "@/domain/repositories";
import type { Payment } from "@/domain/types";
import { KEYS, read, uid, write } from "./localStorageDatabase";
import { authLocalRepository } from "./authLocalRepository";
import { activityLogLocalRepository } from "./activityLogLocalRepository";
import { clientLocalRepository } from "./clientLocalRepository";
import { adminSettingsLocalRepository } from "./adminSettingsLocalRepository";
import { notificationLocalRepository } from "./notificationLocalRepository";
import { formatDateFR, formatTND } from "@/lib/format";

const list = () => read<Payment[]>(KEYS.payments, []);

export const paymentLocalRepository: PaymentRepository = {
  getAll() { return list(); },
  getByClientId(clientId) { return list().filter((p) => p.client_id === clientId); },
  create(input) {
    const u = authLocalRepository.getCurrentUser();
    const now = new Date().toISOString();
    const p: Payment = {
      ...input, id: uid(),
      created_by: u?.name ?? "—", created_at: now,
      pending_sync: true, sync_status: "pending",
    };
    write(KEYS.payments, [p, ...list()]);

    const client = clientLocalRepository.getById(p.client_id) as any;
    activityLogLocalRepository.create({
      user_id: u?.id ?? "", user_name: u?.name ?? "—",
      action_type: "payment_create",
      description: `Paiement de ${formatTND(p.montant)} pour ${client?.nom_complet ?? "—"}`,
      entity_type: "payment", entity_id: p.id,
    });

    // Queue notifications (admin + client)
    const settings = adminSettingsLocalRepository.get() as any;
    const dateFr = formatDateFR(p.date_paiement);
    const emailBody = `Bonjour,\n\nUn paiement a été enregistré.\n\nClient : ${client?.nom_complet}\nMontant : ${formatTND(p.montant)}\nDate : ${dateFr}\nHeure : ${p.heure_paiement}\nEnregistré par : ${u?.name}\n\nMerci.`;
    const waBody = `Paiement enregistré\n\nClient : ${client?.nom_complet}\nMontant : ${formatTND(p.montant)}\nDate : ${dateFr}\nHeure : ${p.heure_paiement}\nEnregistré par : ${u?.name}`;
    notificationLocalRepository.create({ type: "email", recipient: settings.admin_email, subject: "Nouveau paiement enregistré", body: emailBody, payment_id: p.id });
    notificationLocalRepository.create({ type: "whatsapp", recipient: settings.admin_whatsapp, subject: "Paiement", body: waBody, payment_id: p.id });
    if (client?.email) notificationLocalRepository.create({ type: "email", recipient: client.email, subject: "Confirmation de paiement", body: emailBody, payment_id: p.id });
    if (client?.telephone) notificationLocalRepository.create({ type: "whatsapp", recipient: client.telephone, subject: "Paiement", body: waBody, payment_id: p.id });

    return p;
  },
};
