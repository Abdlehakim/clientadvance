import type { User } from "@/domain/types";
import { getDb, isTauriRuntime } from "./sqliteClient";

const AUTH_TOKEN_STATE_KEY = "auth_token";
const AUTH_USER_STATE_KEY = "auth_user";

function canUseSqliteAuthSessionStorage() {
  return import.meta.env.VITE_STORAGE_DRIVER === "sqlite" && isTauriRuntime();
}

export async function persistSqliteAuthSession(token: string, user: User) {
  if (!canUseSqliteAuthSessionStorage()) {
    return;
  }

  const db = await getDb();
  await db.execute(
    `
      INSERT INTO app_state (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `,
    [AUTH_TOKEN_STATE_KEY, token],
  );
  await db.execute(
    `
      INSERT INTO app_state (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `,
    [AUTH_USER_STATE_KEY, JSON.stringify(user)],
  );
}

export async function clearSqliteAuthSession() {
  if (!canUseSqliteAuthSessionStorage()) {
    return;
  }

  const db = await getDb();
  await db.execute("DELETE FROM app_state WHERE key IN (?, ?)", [
    AUTH_TOKEN_STATE_KEY,
    AUTH_USER_STATE_KEY,
  ]);
}
