import type { Role, User } from "@/domain/types";

const env = import.meta.env as ImportMetaEnv & {
  DEFAULT_ADMIN_EMAIL?: string;
  DEFAULT_ADMIN_PASSWORD?: string;
  DEFAULT_ADMIN_NAME?: string;
};

// Development/demo defaults only. Override through env when needed.
export const DEFAULT_ADMIN_EMAIL = (
  env.DEFAULT_ADMIN_EMAIL ?? "admin@demo.com"
).trim().toLowerCase();

// Development/demo password only. Never persist this value in plaintext.
export const DEFAULT_ADMIN_PASSWORD = env.DEFAULT_ADMIN_PASSWORD ?? "admin123";

export const DEFAULT_ADMIN_NAME = (
  env.DEFAULT_ADMIN_NAME ?? "Admin Principal"
).trim();

export const DEFAULT_ADMIN_ID = "local_admin_demo";
export const DEFAULT_ADMIN_ROLE: Role = "admin";
export const DEFAULT_ADMIN_ACTIVE = true;

export function createDefaultAdminUser(): User {
  return {
    id: DEFAULT_ADMIN_ID,
    email: DEFAULT_ADMIN_EMAIL,
    password: "",
    name: DEFAULT_ADMIN_NAME,
    role: DEFAULT_ADMIN_ROLE,
  };
}
