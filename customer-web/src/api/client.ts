import type { AdminSettings, AuthUser, Client, Payment } from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ??
  "http://localhost:4000/api";

const TOKEN_KEY = "gestion-facile.customer-web.session-token";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export function getSessionToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setSessionToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearSessionToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getSessionToken();
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      payload && typeof payload.message === "string"
        ? payload.message
        : "Erreur serveur";
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export async function login(email: string, password: string) {
  const result = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  setSessionToken(result.token);
  return result.user;
}

export function getCurrentUser() {
  return apiRequest<AuthUser>("/auth/me");
}

export async function logout() {
  try {
    await apiRequest<{ success: boolean }>("/auth/logout", {
      method: "POST",
    });
  } finally {
    clearSessionToken();
  }
}

export function listClients() {
  return apiRequest<Client[]>("/clients");
}

export function listPayments() {
  return apiRequest<Payment[]>("/payments");
}

export function getAdminSettings() {
  return apiRequest<AdminSettings>("/admin-settings");
}
