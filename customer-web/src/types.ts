export type UserRole = "admin" | "employe";
export type ServerMode = "with-server" | "without-server";
export type NotificationDeliveryMode = "backend" | "desktop-email";
export type SyncStatus = "local" | "pending" | "synced" | "failed";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company_id: string | null;
  company_name: string | null;
  server_mode: ServerMode;
  notification_delivery_mode: NotificationDeliveryMode;
}

export interface Client {
  id: string;
  nom_complet: string;
  telephone: string;
  adresse: string;
  email: string;
  cin: string;
  created_at: string;
  updated_at: string;
  pending_sync: boolean;
  sync_status: SyncStatus;
}

export interface Payment {
  id: string;
  client_id: string;
  montant: number;
  date_paiement: string;
  heure_paiement: string;
  created_by: string;
  created_at: string;
  pending_sync: boolean;
  sync_status: SyncStatus;
}

export interface AdminSettings {
  id: string;
  admin_email: string;
  admin_whatsapp: string;
  server_mode: ServerMode;
  notification_delivery_mode: NotificationDeliveryMode;
  updated_at: string;
  pending_sync: boolean;
  sync_status: SyncStatus;
}
