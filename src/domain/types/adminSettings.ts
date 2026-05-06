import type { Syncable } from "./sync";

export interface AdminSettings extends Syncable {
  admin_email: string;
  admin_whatsapp: string;
  updated_at: string;
}

export type AdminSettingsUpdateInput = Partial<Pick<AdminSettings, "admin_email" | "admin_whatsapp">>;
