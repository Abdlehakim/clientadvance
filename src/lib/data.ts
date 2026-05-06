import type {
  ActivityLog,
  AdminSettings,
  Client,
  Notification,
  Payment,
  User,
} from "./types";

const KEYS = {
  clients: "gcp_clients",
  payments: "gcp_payments",
  logs: "gcp_logs",
  settings: "gcp_settings",
  notifications: "gcp_notifications",
  user: "gcp_user",
  online: "gcp_online",
  lastSync: "gcp_last_sync",
  seeded: "gcp_seeded_v1",
};

export const USERS: User[] = [
  { id: "u1", email: "admin@demo.com", password: "admin123", name: "Admin Principal", role: "admin" },
  { id: "u2", email: "employe@demo.com", password: "employe123", name: "Employé 1", role: "employe" },
];

const isBrowser = () => typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("gcp:data-change"));
}

export function seedIfNeeded() {
  if (!isBrowser()) return;
  if (localStorage.getItem(KEYS.seeded)) return;
  const now = new Date().toISOString();
  const clients: Client[] = [
    { id: "c1", nom_complet: "Ahmed Ben Ali", telephone: "+216 22 111 222", adresse: "Tunis", email: "ahmed@example.com", cin: "12345678", created_at: now, updated_at: now, created_by: "Admin Principal", updated_by: "Admin Principal", pending_sync: false, sync_status: "synced" },
    { id: "c2", nom_complet: "Mariem Trabelsi", telephone: "+216 24 333 444", adresse: "Sfax", email: "mariem@example.com", cin: "23456789", created_at: now, updated_at: now, created_by: "Admin Principal", updated_by: "Admin Principal", pending_sync: false, sync_status: "synced" },
    { id: "c3", nom_complet: "Sami Jaziri", telephone: "+216 25 555 666", adresse: "Sousse", email: "sami@example.com", cin: "34567890", created_at: now, updated_at: now, created_by: "Admin Principal", updated_by: "Admin Principal", pending_sync: false, sync_status: "synced" },
  ];
  const payments: Payment[] = [
    { id: "p1", client_id: "c1", montant: 250, date_paiement: "2026-05-05", heure_paiement: "10:30", created_by: "Employé 1", created_at: now, pending_sync: false, sync_status: "synced" },
    { id: "p2", client_id: "c2", montant: 120, date_paiement: "2026-05-04", heure_paiement: "14:15", created_by: "Admin Principal", created_at: now, pending_sync: false, sync_status: "synced" },
  ];
  const settings: AdminSettings = {
    id: "s1", admin_email: "admin@example.com", admin_whatsapp: "+216 22 000 000", updated_at: now, pending_sync: false, sync_status: "synced",
  };
  localStorage.setItem(KEYS.clients, JSON.stringify(clients));
  localStorage.setItem(KEYS.payments, JSON.stringify(payments));
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
  localStorage.setItem(KEYS.logs, JSON.stringify([]));
  localStorage.setItem(KEYS.notifications, JSON.stringify([]));
  localStorage.setItem(KEYS.online, "true");
  localStorage.setItem(KEYS.seeded, "1");
}

const uid = () => Math.random().toString(36).slice(2, 10);

// Auth
export function getCurrentUser(): User | null {
  return read<User | null>(KEYS.user, null);
}
export function login(email: string, password: string): User | null {
  const u = USERS.find((x) => x.email === email && x.password === password);
  if (u) {
    write(KEYS.user, u);
    addActivityLog({ user_id: u.id, user_name: u.name, action_type: "login", description: `Connexion de ${u.name}`, entity_type: "user", entity_id: u.id });
  }
  return u ?? null;
}
export function logout() {
  if (isBrowser()) localStorage.removeItem(KEYS.user);
  if (isBrowser()) window.dispatchEvent(new CustomEvent("gcp:data-change"));
}

// Clients
export function getClients(): Client[] { return read<Client[]>(KEYS.clients, []); }
export function getClient(id: string) { return getClients().find((c) => c.id === id) ?? null; }
export function createClient(input: Omit<Client, "id"|"created_at"|"updated_at"|"created_by"|"updated_by"|"pending_sync"|"sync_status">) {
  const u = getCurrentUser();
  const now = new Date().toISOString();
  const c: Client = { ...input, id: uid(), created_at: now, updated_at: now, created_by: u?.name ?? "—", updated_by: u?.name ?? "—", pending_sync: true, sync_status: "pending" };
  write(KEYS.clients, [c, ...getClients()]);
  addActivityLog({ user_id: u?.id ?? "", user_name: u?.name ?? "—", action_type: "client_create", description: `Création du client ${c.nom_complet}`, entity_type: "client", entity_id: c.id });
  return c;
}
export function updateClient(id: string, patch: Partial<Client>) {
  const u = getCurrentUser();
  const list = getClients().map((c) => c.id === id ? { ...c, ...patch, updated_at: new Date().toISOString(), updated_by: u?.name ?? c.updated_by, pending_sync: true, sync_status: "pending" as const } : c);
  write(KEYS.clients, list);
  addActivityLog({ user_id: u?.id ?? "", user_name: u?.name ?? "—", action_type: "client_update", description: `Modification du client ${patch.nom_complet ?? id}`, entity_type: "client", entity_id: id });
}
export function deleteClient(id: string) {
  const u = getCurrentUser();
  const c = getClient(id);
  write(KEYS.clients, getClients().filter((x) => x.id !== id));
  addActivityLog({ user_id: u?.id ?? "", user_name: u?.name ?? "—", action_type: "client_delete", description: `Suppression du client ${c?.nom_complet ?? id}`, entity_type: "client", entity_id: id });
}

// Payments
export function getPayments(): Payment[] { return read<Payment[]>(KEYS.payments, []); }
export function getPaymentsByClient(clientId: string) { return getPayments().filter((p) => p.client_id === clientId); }
export function createPayment(input: Omit<Payment, "id"|"created_by"|"created_at"|"pending_sync"|"sync_status">) {
  const u = getCurrentUser();
  const now = new Date().toISOString();
  const p: Payment = { ...input, id: uid(), created_by: u?.name ?? "—", created_at: now, pending_sync: true, sync_status: "pending" };
  write(KEYS.payments, [p, ...getPayments()]);
  const client = getClient(p.client_id);
  addActivityLog({ user_id: u?.id ?? "", user_name: u?.name ?? "—", action_type: "payment_create", description: `Paiement de ${formatTND(p.montant)} pour ${client?.nom_complet ?? "—"}`, entity_type: "payment", entity_id: p.id });
  // Notifications
  const settings = getAdminSettings();
  const dateFr = formatDateFR(p.date_paiement);
  const emailBody = `Bonjour,\n\nUn paiement a été enregistré.\n\nClient : ${client?.nom_complet}\nMontant : ${formatTND(p.montant)}\nDate : ${dateFr}\nHeure : ${p.heure_paiement}\nEnregistré par : ${u?.name}\n\nMerci.`;
  const waBody = `Paiement enregistré\n\nClient : ${client?.nom_complet}\nMontant : ${formatTND(p.montant)}\nDate : ${dateFr}\nHeure : ${p.heure_paiement}\nEnregistré par : ${u?.name}`;
  pushNotification({ type: "email", recipient: settings.admin_email, subject: "Nouveau paiement enregistré", body: emailBody, payment_id: p.id });
  pushNotification({ type: "whatsapp", recipient: settings.admin_whatsapp, subject: "Paiement", body: waBody, payment_id: p.id });
  if (client?.email) pushNotification({ type: "email", recipient: client.email, subject: "Confirmation de paiement", body: emailBody, payment_id: p.id });
  if (client?.telephone) pushNotification({ type: "whatsapp", recipient: client.telephone, subject: "Paiement", body: waBody, payment_id: p.id });
  return p;
}

// Settings
export function getAdminSettings(): AdminSettings {
  return read<AdminSettings>(KEYS.settings, { id: "s1", admin_email: "", admin_whatsapp: "", updated_at: new Date().toISOString(), pending_sync: false, sync_status: "synced" });
}
export function updateAdminSettings(patch: Partial<AdminSettings>) {
  const u = getCurrentUser();
  const current = getAdminSettings();
  const next: AdminSettings = { ...current, ...patch, updated_at: new Date().toISOString(), pending_sync: true, sync_status: "pending" };
  write(KEYS.settings, next);
  addActivityLog({ user_id: u?.id ?? "", user_name: u?.name ?? "—", action_type: "settings_update", description: `Mise à jour des paramètres administrateur`, entity_type: "settings", entity_id: next.id });
}

// Logs
export function getActivityLogs(): ActivityLog[] { return read<ActivityLog[]>(KEYS.logs, []); }
export function addActivityLog(input: Omit<ActivityLog, "id"|"created_at">) {
  const log: ActivityLog = { ...input, id: uid(), created_at: new Date().toISOString() };
  write(KEYS.logs, [log, ...getActivityLogs()]);
}

// Notifications
export function getNotifications(): Notification[] { return read<Notification[]>(KEYS.notifications, []); }
export function pushNotification(input: Omit<Notification, "id"|"created_at">) {
  const n: Notification = { ...input, id: uid(), created_at: new Date().toISOString() };
  write(KEYS.notifications, [n, ...getNotifications()]);
}

// Sync / online
export function isOnline(): boolean { return read<string>(KEYS.online, "true") === "true"; }
export function setOnline(v: boolean) {
  if (!isBrowser()) return;
  localStorage.setItem(KEYS.online, String(v));
  window.dispatchEvent(new CustomEvent("gcp:data-change"));
}
export function getLastSync(): string | null { return read<string | null>(KEYS.lastSync, null); }

export function getPendingCount(): number {
  const c = getClients().filter((x) => x.pending_sync).length;
  const p = getPayments().filter((x) => x.pending_sync).length;
  const s = getAdminSettings().pending_sync ? 1 : 0;
  return c + p + s;
}

export function syncPendingData(): { ok: boolean; synced: number } {
  if (!isOnline()) return { ok: false, synced: 0 };
  const u = getCurrentUser();
  let count = 0;
  const clients = getClients().map((c) => { if (c.pending_sync) { count++; return { ...c, pending_sync: false, sync_status: "synced" as const }; } return c; });
  const payments = getPayments().map((p) => { if (p.pending_sync) { count++; return { ...p, pending_sync: false, sync_status: "synced" as const }; } return p; });
  const settings = getAdminSettings();
  const newSettings = settings.pending_sync ? { ...settings, pending_sync: false, sync_status: "synced" as const } : settings;
  if (settings.pending_sync) count++;
  if (isBrowser()) {
    localStorage.setItem(KEYS.clients, JSON.stringify(clients));
    localStorage.setItem(KEYS.payments, JSON.stringify(payments));
    localStorage.setItem(KEYS.settings, JSON.stringify(newSettings));
    localStorage.setItem(KEYS.lastSync, new Date().toISOString());
  }
  addActivityLog({ user_id: u?.id ?? "", user_name: u?.name ?? "—", action_type: "sync", description: `Synchronisation manuelle effectuée (${count} éléments)`, entity_type: "sync", entity_id: "-" });
  if (isBrowser()) window.dispatchEvent(new CustomEvent("gcp:data-change"));
  return { ok: true, synced: count };
}

// Helpers
export function formatTND(n: number): string {
  return `${n.toFixed(3).replace(",", ".")} TND`;
}
export function formatDateFR(iso: string): string {
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleDateString("fr-FR");
}
export function formatDateTimeFR(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return { date: d.toLocaleDateString("fr-FR"), time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) };
}
