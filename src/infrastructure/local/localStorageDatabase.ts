/**
 * LocalStorage-backed storage primitive.
 *
 * This is a TEMPORARY adapter used while the desktop app runs in the browser
 * preview. In production it will be replaced by SQLite (via Tauri) — see
 * docs/TAURI_SQLITE_PLAN.md.
 */
export const KEYS = {
  clients: "gcp_clients",
  payments: "gcp_payments",
  logs: "gcp_logs",
  settings: "gcp_settings",
  notifications: "gcp_notifications",
  user: "gcp_user",
  online: "gcp_online",
  lastSync: "gcp_last_sync",
  seeded: "gcp_seeded_v1",
} as const;

export const isBrowser = () => typeof window !== "undefined";

export function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("gcp:data-change"));
}

export function emitChange() {
  if (isBrowser()) window.dispatchEvent(new CustomEvent("gcp:data-change"));
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function seedIfNeeded() {
  if (!isBrowser()) return;
  if (localStorage.getItem(KEYS.seeded)) return;
  const now = new Date().toISOString();
  const clients = [
    { id: "c1", nom_complet: "Ahmed Ben Ali", telephone: "+216 22 111 222", adresse: "Tunis", email: "ahmed@example.com", cin: "12345678", created_at: now, updated_at: now, created_by: "Admin Principal", updated_by: "Admin Principal", deleted_at: null, remote_updated_at: now, pending_sync: false, sync_status: "synced" },
    { id: "c2", nom_complet: "Mariem Trabelsi", telephone: "+216 24 333 444", adresse: "Sfax", email: "mariem@example.com", cin: "23456789", created_at: now, updated_at: now, created_by: "Admin Principal", updated_by: "Admin Principal", deleted_at: null, remote_updated_at: now, pending_sync: false, sync_status: "synced" },
    { id: "c3", nom_complet: "Sami Jaziri", telephone: "+216 25 555 666", adresse: "Sousse", email: "sami@example.com", cin: "34567890", created_at: now, updated_at: now, created_by: "Admin Principal", updated_by: "Admin Principal", deleted_at: null, remote_updated_at: now, pending_sync: false, sync_status: "synced" },
  ];
  const payments = [
    { id: "p1", client_id: "c1", montant: 250, date_paiement: "2026-05-05", heure_paiement: "10:30", created_by: "Employé 1", created_at: now, remote_updated_at: now, pending_sync: false, sync_status: "synced" },
    { id: "p2", client_id: "c2", montant: 120, date_paiement: "2026-05-04", heure_paiement: "14:15", created_by: "Admin Principal", created_at: now, remote_updated_at: now, pending_sync: false, sync_status: "synced" },
  ];
  const settings = { id: "settings_default", admin_email: "admin@example.com", admin_whatsapp: "+216 22 000 000", updated_at: now, updated_by: "Admin Principal", remote_updated_at: now, pending_sync: false, sync_status: "synced" };
  localStorage.setItem(KEYS.clients, JSON.stringify(clients));
  localStorage.setItem(KEYS.payments, JSON.stringify(payments));
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
  localStorage.setItem(KEYS.logs, JSON.stringify([]));
  localStorage.setItem(KEYS.notifications, JSON.stringify([]));
  localStorage.setItem(KEYS.online, "true");
  localStorage.setItem(KEYS.seeded, "1");
}
