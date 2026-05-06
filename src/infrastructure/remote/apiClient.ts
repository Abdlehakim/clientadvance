import { isBrowser } from "@/infrastructure/local/localStorageDatabase";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";
const AUTH_TOKEN_KEY = "gestion_facile_auth_token";

let authToken: string | null = isBrowser() ? localStorage.getItem(AUTH_TOKEN_KEY) : null;

export function getAuthToken() {
  if (!isBrowser()) return authToken;
  authToken = localStorage.getItem(AUTH_TOKEN_KEY);
  return authToken;
}

export function setAuthToken(token: string) {
  authToken = token;
  if (isBrowser()) localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  authToken = null;
  if (isBrowser()) localStorage.removeItem(AUTH_TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, public payload: unknown, message: string) {
    super(message);
  }
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getAuthToken();
  const hasJsonBody = init.body !== undefined && !(init.body instanceof FormData);

  if (hasJsonBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch (error) {
    throw new ApiError(0, null, error instanceof Error ? error.message : "Serveur indisponible");
  }

  const text = await response.text();
  const payload = text ? safeJson(text) : null;

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthToken();
    }

    throw new ApiError(
      response.status,
      payload,
      getApiErrorMessage(response.status, payload, path),
    );
  }

  return payload as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getApiErrorMessage(status: number, payload: unknown, path: string) {
  if (typeof payload === "object" && payload && "message" in payload && typeof payload.message === "string") {
    return payload.message;
  }

  return `API ${status} sur ${path}`;
}
