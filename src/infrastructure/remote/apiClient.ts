/**
 * Centralized HTTP client for the remote Node.js + PostgreSQL API.
 *
 * Configuration via Vite env:
 *   VITE_API_BASE_URL=http://localhost:4000/api
 *
 * Auth: a JWT bearer token is attached when present (set via setAuthToken()).
 */
const BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:4000/api";

let authToken: string | null = null;
export function setAuthToken(t: string | null) { authToken = t; }
export function getAuthToken() { return authToken; }

export class ApiError extends Error {
  constructor(public status: number, public payload: unknown, message: string) {
    super(message);
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  const payload = text ? safeJson(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, payload, `API ${res.status} ${res.statusText} on ${path}`);
  }
  return payload as T;
}

function safeJson(t: string): unknown {
  try { return JSON.parse(t); } catch { return t; }
}
