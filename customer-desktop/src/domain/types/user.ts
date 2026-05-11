export type Role = "admin" | "employe";

export interface User {
  id: string;
  email: string;
  password: string; // kept empty in persisted session payloads
  name: string;
  role: Role;
  company_id?: string | null;
  company_name?: string | null;
  server_mode?: "with-server" | "without-server" | null;
  notification_delivery_mode?: "backend" | "desktop-email" | null;
}
