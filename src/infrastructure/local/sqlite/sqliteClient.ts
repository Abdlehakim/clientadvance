export type SqliteParam = string | number | boolean | null;
export type SqliteRow = Record<string, unknown>;

export interface SqliteStatement {
  sql: string;
  params?: SqliteParam[];
}

export interface SqliteDatabaseInfo {
  path: string;
  directory: string;
  isCustom: boolean;
}

export interface ChangeDatabaseLocationResult {
  location: SqliteDatabaseInfo;
  replacedExisting: boolean;
  requiresConfirmation: boolean;
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

export function resetSqliteInitialization() {
  sqliteInitPromise = null;
}

export async function getDatabaseLocation() {
  return invokeTauriCommand<SqliteDatabaseInfo>("get_database_location");
}

export async function openDatabaseLocation() {
  return invokeTauriCommand<void>("open_database_location");
}

export async function chooseDatabaseFolder() {
  return invokeTauriCommand<string | null>("choose_database_folder");
}

export async function changeDatabaseLocation(
  folderPath: string,
  replaceExisting = false,
) {
  return invokeTauriCommand<ChangeDatabaseLocationResult>("change_database_location", {
    request: { folderPath, replaceExisting },
  });
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
