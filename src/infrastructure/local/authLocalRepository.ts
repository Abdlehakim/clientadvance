import type { AuthRepository } from "@/domain/repositories";
import type { User } from "@/domain/types";
import { KEYS, emitChange, isBrowser, read, write } from "./localStorageDatabase";
import { activityLogLocalRepository } from "./activityLogLocalRepository";
import { clearAuthToken } from "@/infrastructure/remote/apiClient";
import { clearSqliteAuthSession } from "@/infrastructure/local/sqlite/sqliteAuthSessionStorage";

const USERS: User[] = [
  { id: "u1", email: "admin@demo.com", password: "admin123", name: "Admin Principal", role: "admin" },
  { id: "u2", email: "employe@demo.com", password: "employe123", name: "Employé 1", role: "employe" },
];

export const authLocalRepository: AuthRepository = {
  login(email, password) {
    const u = USERS.find((x) => x.email === email && x.password === password);
    if (u) {
      write(KEYS.user, u);
      activityLogLocalRepository.create({
        user_id: u.id, user_name: u.name, action_type: "login",
        description: `Connexion de ${u.name}`, entity_type: "user", entity_id: u.id,
      });
    }
    return u ?? null;
  },
  logout() {
    clearAuthToken();
    void clearSqliteAuthSession();
    if (isBrowser()) localStorage.removeItem(KEYS.user);
    emitChange();
  },
  getCurrentUser() {
    return read<User | null>(KEYS.user, null);
  },
};

export const DEMO_USERS = USERS;
