/** Remote payment repository — placeholder. Endpoints: GET/POST /payments */
import type { PaymentRepository } from "@/domain/repositories";
import { apiFetch } from "./apiClient";

export const paymentRemoteRepository: PaymentRepository = {
  async getAll() { return apiFetch("/payments"); },
  async getByClientId(clientId) { return apiFetch(`/payments?client_id=${encodeURIComponent(clientId)}`); },
  async create(input) { return apiFetch("/payments", { method: "POST", body: JSON.stringify(input) }); },
};
