/**
 * SQLite client (Tauri) — placeholder.
 *
 * In the real desktop build this module will:
 *  - import a SQLite plugin (e.g. `@tauri-apps/plugin-sql` or `tauri-plugin-sql-api`)
 *  - open a database file under the app data directory
 *  - expose a typed `query` / `execute` API
 *
 * Example skeleton:
 *
 *   import Database from "@tauri-apps/plugin-sql";
 *   let db: Database | null = null;
 *   export async function getDb() {
 *     if (!db) db = await Database.load("sqlite:gestion.db");
 *     return db;
 *   }
 *
 * SQLite will be the OFFLINE source of truth. Pending rows
 * (`pending_sync = true`) are pushed to the Node.js API by the sync service.
 */
export async function getDb(): Promise<unknown> {
  throw new Error("SQLite client not implemented in browser preview. Use Tauri build.");
}
