/**
 * Remote notification dispatch — placeholder.
 *
 * Endpoints:
 *   POST /notifications/email     { to, subject, body }
 *   POST /notifications/whatsapp  { to, body }
 *
 * The server is responsible for the actual delivery (SMTP / WhatsApp Cloud API).
 */
import { apiFetch } from "./apiClient";

export const notificationRemoteService = {
  async sendEmail(to: string, subject: string, body: string) {
    return apiFetch("/notifications/email", { method: "POST", body: JSON.stringify({ to, subject, body }) });
  },
  async sendWhatsApp(to: string, body: string) {
    return apiFetch("/notifications/whatsapp", { method: "POST", body: JSON.stringify({ to, body }) });
  },
};
