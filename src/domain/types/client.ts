import type { Syncable } from "./sync";

export interface Client extends Syncable {
  nom_complet: string;
  telephone: string;
  adresse: string;
  email: string;
  cin: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export type ClientCreateInput = Omit<
  Client,
  "id" | "created_at" | "updated_at" | "created_by" | "updated_by" | "pending_sync" | "sync_status"
>;
export type ClientUpdateInput = Partial<ClientCreateInput>;
