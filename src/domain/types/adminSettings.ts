import type { Syncable } from "./sync";

export interface AdminSettings extends Syncable {
  id: string;
  admin_email: string;
  admin_whatsapp: string;
  updated_at: string;
  updated_by?: string;
  remote_updated_at?: string;
}

export type AdminSettingsUpdateInput = Partial<Pick<AdminSettings, "admin_email" | "admin_whatsapp">>;
