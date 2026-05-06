/**
 * SQLite repository for clients (Tauri build).
 *
 * Will replace clientLocalRepository when the app runs as a desktop binary.
 * Schema (proposed):
 *   CREATE TABLE clients (
 *     id TEXT PRIMARY KEY,
 *     nom_complet TEXT NOT NULL,
 *     telephone TEXT,
 *     adresse TEXT,
 *     email TEXT,
 *     cin TEXT,
 *     created_at TEXT, updated_at TEXT,
 *     created_by TEXT, updated_by TEXT,
 *     pending_sync INTEGER DEFAULT 1,
 *     sync_status TEXT DEFAULT 'pending'
 *   );
 */
import type { ClientRepository } from "@/domain/repositories";

export const clientSQLiteRepository: ClientRepository = {
  getAll() { throw new Error("TODO: SELECT * FROM clients ORDER BY created_at DESC"); },
  getById() { throw new Error("TODO: SELECT * FROM clients WHERE id = ?"); },
  create() { throw new Error("TODO: INSERT INTO clients (...) with pending_sync=1"); },
  update() { throw new Error("TODO: UPDATE clients SET ..., pending_sync=1, sync_status='pending'"); },
  delete() { throw new Error("TODO: DELETE FROM clients WHERE id = ? (or soft delete + queue)"); },
};
