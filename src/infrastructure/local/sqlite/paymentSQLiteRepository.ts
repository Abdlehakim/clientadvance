/** SQLite repository for payments (Tauri build) — placeholder. */
import type { PaymentRepository } from "@/domain/repositories";

export const paymentSQLiteRepository: PaymentRepository = {
  getAll() { throw new Error("TODO: SELECT * FROM payments"); },
  getByClientId() { throw new Error("TODO: SELECT * FROM payments WHERE client_id = ?"); },
  create() { throw new Error("TODO: INSERT INTO payments(...) with pending_sync=1"); },
};
