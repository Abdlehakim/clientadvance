export type SyncStatus = "local" | "pending" | "synced" | "failed";
export type Role = "admin" | "employe";

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
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
  created_by: string;
  updated_by: string;
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

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action_type: string;
  description: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

export interface AdminSettings {
  id: string;
  admin_email: string;
  admin_whatsapp: string;
  updated_at: string;
  pending_sync: boolean;
  sync_status: SyncStatus;
}

export interface Notification {
  id: string;
  type: "email" | "whatsapp";
  recipient: string;
  subject: string;
  body: string;
  created_at: string;
  payment_id: string;
}
