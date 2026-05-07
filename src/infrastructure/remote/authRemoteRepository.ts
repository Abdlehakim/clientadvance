import type { AuthRepository } from "@/domain/repositories";
import type { User } from "@/domain/types";
import {
  authenticateOfflineCredential,
  persistOfflineCredential,
} from "@/infrastructure/auth/offlineAuthStorage";
import {
  clearSqliteAuthSession,
  persistSqliteAuthSession,
} from "@/infrastructure/local/sqlite/sqliteAuthSessionStorage";
import {
  apiFetch,
  ApiError,
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
import { isConnectionOnline } from "@/services/connectionService";

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

function persistUser(user: User | null, mode: "online" | "offline" | null) {
  if (!isBrowser()) {
    return;
  }

  if (!user) {
    localStorage.removeItem(KEYS.user);
    localStorage.removeItem(KEYS.authSessionMode);
    emitChange();
    return;
  }

  write(KEYS.user, user);

  if (mode) {
    write(KEYS.authSessionMode, mode);
  } else {
    localStorage.removeItem(KEYS.authSessionMode);
    emitChange();
  }
}

function readStoredUser() {
  return read<User | null>(KEYS.user, null);
}

function readSessionMode() {
  return read<string | null>(KEYS.authSessionMode, null);
}

async function persistOfflineLoginArtifacts(
  user: User,
  password: string,
  token: string | null,
  mode: "online" | "offline",
) {
  try {
    await persistOfflineCredential(user, password);
    await persistSqliteAuthSession({ token, user, mode });
  } catch (error) {
    console.error("Offline credential persistence failed.", error);
  }
}

export const authRemoteRepository: AuthRepository = {
  async login(email, password) {
    const normalizedEmail = email.trim().toLowerCase();

    if (isConnectionOnline()) {
      try {
        const response = await apiFetch<LoginResponse>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: normalizedEmail, password }),
        });

        setAuthToken(response.token);
        const user = toDomainUser(response.user);
        persistUser(user, "online");
        await persistOfflineLoginArtifacts(user, password, response.token, "online");
        return user;
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 0) {
          throw error;
        }
      }
    }

    const localResult = await authenticateOfflineCredential(normalizedEmail, password);

    if (localResult.status === "missing") {
      throw new Error("Connexion impossible hors ligne. Connectez-vous une première fois avec internet.");
    }

    if (localResult.status === "invalid") {
      return null;
    }

    if (localResult.status === "inactive") {
      throw new Error("Compte désactivé");
    }

    clearAuthToken();
    persistUser(localResult.user, "offline");
    await persistOfflineLoginArtifacts(localResult.user, password, null, "offline");
    return localResult.user;
  },
  async logout() {
    const token = getAuthToken();

    clearAuthToken();
    persistUser(null, null);
    void clearSqliteAuthSession();

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
    if (getAuthToken()) {
      return readStoredUser();
    }

    if (readSessionMode() === "offline") {
      return readStoredUser();
    }

    return null;
  },
};
