export type Role = "admin" | "employe";

export interface User {
  id: string;
  email: string;
  password: string; // only used in local demo adapter
  name: string;
  role: Role;
}
