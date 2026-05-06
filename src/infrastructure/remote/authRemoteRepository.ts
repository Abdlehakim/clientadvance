import type { AuthRepository } from "@/domain/repositories";
import type { User } from "@/domain/types";
import {
  apiFetch,
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from "./apiClient";
import {
  KEYS,
  emitChange,
  isBrowser,
  read,
  write,
} from "@/infrastructure/local/localStorageDatabase";

interface RemoteUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "employe";
}

interface LoginResponse {
  token: string;
  user: RemoteUser;
}

function toDomainUser(user: RemoteUser): User {
  return {
    ...user,
    password: "",
  };
}

function persistUser(user: User | null) {
  if (!isBrowser()) return;

  if (!user) {
    localStorage.removeItem(KEYS.user);
    emitChange();
    return;
  }

  write(KEYS.user, user);
}

function readStoredUser() {
  return read<User | null>(KEYS.user, null);
}

export const authRemoteRepository: AuthRepository = {
  async login(email, password) {
    const response = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setAuthToken(response.token);
    const user = toDomainUser(response.user);
    persistUser(user);
    return user;
  },
  async logout() {
    const token = getAuthToken();

    clearAuthToken();
    persistUser(null);

    try {
      if (token) {
        await apiFetch("/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch {
      // Ignore logout API failures and always clear local auth state.
    }
  },
  getCurrentUser() {
    if (!getAuthToken()) {
      return null;
    }

    return readStoredUser();
  },
};
