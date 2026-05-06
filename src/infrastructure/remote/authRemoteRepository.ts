/**
 * Remote auth — placeholder. POST /auth/login -> { user, token }
 */
import type { AuthRepository } from "@/domain/repositories";
import type { User } from "@/domain/types";
import { apiFetch, setAuthToken } from "./apiClient";

let cached: User | null = null;

export const authRemoteRepository: AuthRepository = {
  async login(email, password) {
    const res = await apiFetch<{ user: User; token: string }>("/auth/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    });
    setAuthToken(res.token);
    cached = res.user;
    return res.user;
  },
  logout() { setAuthToken(null); cached = null; },
  getCurrentUser() { return cached; },
};
