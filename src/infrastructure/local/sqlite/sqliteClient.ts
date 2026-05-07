export type SqliteParam = string | number | boolean | null;
export type SqliteRow = Record<string, unknown>;

export interface SqliteStatement {
  sql: string;
  params?: SqliteParam[];
}

export interface SqliteDatabaseInfo {
  path: string;
}

export interface SqliteExecuteResult {
  rowsAffected: number;
  lastInsertRowid: number;
}

export interface SqliteDatabaseClient {
  execute(sql: string, params?: SqliteParam[]): Promise<SqliteExecuteResult>;
  query<T extends SqliteRow = SqliteRow>(sql: string, params?: SqliteParam[]): Promise<T[]>;
}

interface TauriInvoke {
  <T>(command: string, args?: Record<string, unknown>): Promise<T>;
}

declare global {
  interface Window {
    __TAURI__?: {
      core?: {
        invoke?: TauriInvoke;
      };
    };
  }
}

let sqliteInitPromise: Promise<SqliteDatabaseInfo> | null = null;

export function isTauriRuntime() {
  return (
    typeof window !== "undefined" &&
    "__TAURI__" in window &&
    typeof window.__TAURI__?.core?.invoke === "function"
  );
}

function getInvoke() {
  const invoke = window.__TAURI__?.core?.invoke;

  if (!invoke) {
    throw new Error("Tauri runtime not available. SQLite storage requires the desktop app.");
  }

  return invoke;
}

export async function invokeTauriCommand<T>(command: string, args?: Record<string, unknown>) {
  if (!isTauriRuntime()) {
    throw new Error("Tauri runtime not available.");
  }

  return getInvoke()<T>(command, args);
}

async function invokeSqliteCommand<T>(command: string, args?: Record<string, unknown>) {
  await initializeSqliteDatabase();
  return invokeTauriCommand<T>(command, args);
}

export async function initializeSqliteDatabase() {
  if (!isTauriRuntime()) {
    throw new Error("SQLite initialization is only available inside the Tauri desktop runtime.");
  }

  sqliteInitPromise ??= getInvoke()<SqliteDatabaseInfo>("sqlite_init");
  return sqliteInitPromise;
}

export async function sqliteExecute(sql: string, params: SqliteParam[] = []) {
  return invokeSqliteCommand<SqliteExecuteResult>("sqlite_execute", {
    statement: { sql, params },
  });
}

export async function sqliteQuery<T extends SqliteRow = SqliteRow>(
  sql: string,
  params: SqliteParam[] = [],
) {
  return invokeSqliteCommand<T[]>("sqlite_query", {
    statement: { sql, params },
  });
}

export async function getDb(): Promise<SqliteDatabaseClient> {
  await initializeSqliteDatabase();

  return {
    execute: sqliteExecute,
    query: sqliteQuery,
  };
}
