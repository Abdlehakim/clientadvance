import type { Role, User } from "@/domain/types";
import {
  createDefaultAdminUser,
  DEFAULT_ADMIN_ACTIVE,
  DEFAULT_ADMIN_PASSWORD,
} from "./defaultAdmin";
import {
  generateOfflinePasswordSalt,
  getOfflinePasswordIterations,
  hashOfflinePassword,
} from "./offlinePassword";
import { hydrateSqliteAuthSession } from "@/infrastructure/local/sqlite/sqliteAuthSessionStorage";
import { getDb, isTauriRuntime, type SqliteRow } from "@/infrastructure/local/sqlite/sqliteClient";
import { KEYS, isBrowser, read, write } from "@/infrastructure/local/localStorageDatabase";

interface OfflineAuthRecord {
  id: string;
  email: string;
  name: string;
  role: Role;
  is_active: boolean;
  password_hash: string;
  password_salt: string;
  password_iterations: number;
  seeded: boolean;
  created_at: string;
  updated_at: string;
}

interface OfflineAuthSqliteRow extends SqliteRow {
  id: unknown;
  email: unknown;
  name: unknown;
  role: unknown;
  is_active: unknown;
  password_hash: unknown;
  password_salt: unknown;
  password_iterations: unknown;
  seeded: unknown;
  created_at: unknown;
  updated_at: unknown;
}

type OfflineAuthVerificationResult =
  | { status: "success"; user: User }
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "inactive" };

let initializationPromise: Promise<void> | null = null;

function usesSqliteCredentialStore() {
  return import.meta.env.VITE_STORAGE_DRIVER === "sqlite" && isTauriRuntime();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function readBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    return value === "1" || value.toLowerCase() === "true";
  }

  return false;
}

function readNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toSessionUser(record: OfflineAuthRecord): User {
  return {
    id: record.id,
    email: record.email,
    password: "",
    name: record.name,
    role: record.role,
  };
}

function toOfflineAuthRecord(row: OfflineAuthSqliteRow): OfflineAuthRecord {
  return {
    id: readString(row.id),
    email: normalizeEmail(readString(row.email)),
    name: readString(row.name),
    role: readString(row.role) === "employe" ? "employe" : "admin",
    is_active: readBoolean(row.is_active),
    password_hash: readString(row.password_hash),
    password_salt: readString(row.password_salt),
    password_iterations: readNumber(row.password_iterations, getOfflinePasswordIterations()),
    seeded: readBoolean(row.seeded),
    created_at: readString(row.created_at),
    updated_at: readString(row.updated_at),
  };
}

function readLocalStorageRecords() {
  return read<OfflineAuthRecord[]>(KEYS.offlineCredentials, []);
}

function writeLocalStorageRecords(records: OfflineAuthRecord[]) {
  write(KEYS.offlineCredentials, records);
}

function findSeededAdminRecord(records: OfflineAuthRecord[]) {
  return records.find((record) => record.seeded && record.role === "admin") ?? null;
}

function areRecordsEquivalent(left: OfflineAuthRecord, right: OfflineAuthRecord) {
  return (
    left.id === right.id &&
    left.email === right.email &&
    left.name === right.name &&
    left.role === right.role &&
    left.is_active === right.is_active &&
    left.password_hash === right.password_hash &&
    left.password_salt === right.password_salt &&
    left.password_iterations === right.password_iterations &&
    left.seeded === right.seeded
  );
}

async function createRecord(
  user: User,
  password: string,
  options: {
    existing?: OfflineAuthRecord | null;
    seeded?: boolean;
    isActive?: boolean;
  } = {},
) {
  const salt = options.existing?.password_salt ?? generateOfflinePasswordSalt();
  const iterations = options.existing?.password_iterations ?? getOfflinePasswordIterations();
  const now = new Date().toISOString();

  return {
    id: options.existing?.id ?? user.id,
    email: normalizeEmail(user.email),
    name: user.name,
    role: user.role,
    is_active: options.isActive ?? options.existing?.is_active ?? true,
    password_hash: await hashOfflinePassword(password, salt, iterations),
    password_salt: salt,
    password_iterations: iterations,
    seeded: options.seeded ?? options.existing?.seeded ?? false,
    created_at: options.existing?.created_at ?? now,
    updated_at: now,
  } satisfies OfflineAuthRecord;
}

async function ensureLocalStorageDefaultAdminSeeded() {
  if (!isBrowser()) {
    return;
  }

  const records = readLocalStorageRecords();
  const seededAdminRecord = findSeededAdminRecord(records);

  if (seededAdminRecord) {
    const adminRecord = await createRecord(createDefaultAdminUser(), DEFAULT_ADMIN_PASSWORD, {
      existing: seededAdminRecord,
      seeded: true,
      isActive: DEFAULT_ADMIN_ACTIVE,
    });

    if (areRecordsEquivalent(seededAdminRecord, adminRecord)) {
      return;
    }

    const nextRecords = records.filter(
      (record) => record.email !== seededAdminRecord.email,
    );
    writeLocalStorageRecords([adminRecord, ...nextRecords]);
    return;
  }

  if (records.length > 0) {
    return;
  }

  const adminUser = createDefaultAdminUser();
  const adminRecord = await createRecord(adminUser, DEFAULT_ADMIN_PASSWORD, {
    seeded: true,
    isActive: DEFAULT_ADMIN_ACTIVE,
  });

  writeLocalStorageRecords([...records, adminRecord]);
}

async function getSqliteOfflineAuthRecordByEmail(email: string) {
  const db = await getDb();
  const rows = await db.query<OfflineAuthSqliteRow>(
    `
      SELECT
        id,
        email,
        name,
        role,
        is_active,
        password_hash,
        password_salt,
        password_iterations,
        seeded,
        created_at,
        updated_at
      FROM local_users
      WHERE email = ?
      LIMIT 1
    `,
    [normalizeEmail(email)],
  );

  return rows[0] ? toOfflineAuthRecord(rows[0]) : null;
}

async function upsertSqliteOfflineAuthRecord(record: OfflineAuthRecord) {
  const db = await getDb();
  await db.execute(
    `
      INSERT INTO local_users (
        id,
        email,
        name,
        role,
        is_active,
        password_hash,
        password_salt,
        password_iterations,
        seeded,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        id = excluded.id,
        name = excluded.name,
        role = excluded.role,
        is_active = excluded.is_active,
        password_hash = excluded.password_hash,
        password_salt = excluded.password_salt,
        password_iterations = excluded.password_iterations,
        seeded = excluded.seeded,
        updated_at = excluded.updated_at
    `,
    [
      record.id,
      record.email,
      record.name,
      record.role,
      record.is_active ? 1 : 0,
      record.password_hash,
      record.password_salt,
      record.password_iterations,
      record.seeded ? 1 : 0,
      record.created_at,
      record.updated_at,
    ],
  );
}

async function ensureSqliteDefaultAdminSeeded() {
  if (!usesSqliteCredentialStore()) {
    return;
  }

  const db = await getDb();
  const seededAdminRows = await db.query<OfflineAuthSqliteRow>(
    `
      SELECT
        id,
        email,
        name,
        role,
        is_active,
        password_hash,
        password_salt,
        password_iterations,
        seeded,
        created_at,
        updated_at
      FROM local_users
      WHERE seeded = 1
        AND role = 'admin'
      LIMIT 1
    `,
  );
  const seededAdminRecord = seededAdminRows[0]
    ? toOfflineAuthRecord(seededAdminRows[0])
    : null;

  if (seededAdminRecord) {
    const adminRecord = await createRecord(createDefaultAdminUser(), DEFAULT_ADMIN_PASSWORD, {
      existing: seededAdminRecord,
      seeded: true,
      isActive: DEFAULT_ADMIN_ACTIVE,
    });

    if (areRecordsEquivalent(seededAdminRecord, adminRecord)) {
      return;
    }

    if (seededAdminRecord.email !== adminRecord.email) {
      await db.execute("DELETE FROM local_users WHERE email = ?", [seededAdminRecord.email]);
    }

    await upsertSqliteOfflineAuthRecord(adminRecord);
    return;
  }

  const adminRows = await db.query<{ admin_count: unknown }>(
    `
      SELECT COUNT(*) AS admin_count
      FROM local_users
      WHERE role = 'admin'
    `,
  );
  const adminCount = readNumber(adminRows[0]?.admin_count, 0);

  if (adminCount > 0) {
    return;
  }

  const adminUser = createDefaultAdminUser();
  const adminRecord = await createRecord(adminUser, DEFAULT_ADMIN_PASSWORD, {
    seeded: true,
    isActive: DEFAULT_ADMIN_ACTIVE,
  });

  await upsertSqliteOfflineAuthRecord(adminRecord);
}

async function getLocalStorageOfflineAuthRecordByEmail(email: string) {
  return (
    readLocalStorageRecords().find((record) => record.email === normalizeEmail(email)) ?? null
  );
}

async function verifyOfflineAuthRecord(
  record: OfflineAuthRecord | null,
  password: string,
): Promise<OfflineAuthVerificationResult> {
  if (!record) {
    return { status: "missing" };
  }

  const hashedPassword = await hashOfflinePassword(
    password,
    record.password_salt,
    record.password_iterations,
  );

  if (hashedPassword !== record.password_hash) {
    return { status: "invalid" };
  }

  if (!record.is_active) {
    return { status: "inactive" };
  }

  return {
    status: "success",
    user: toSessionUser(record),
  };
}

export async function initializeOfflineAuthStorage() {
  if (!isBrowser()) {
    return;
  }

  initializationPromise ??= (async () => {
    if (usesSqliteCredentialStore()) {
      await ensureSqliteDefaultAdminSeeded();
      await hydrateSqliteAuthSession();
      return;
    }

    await ensureLocalStorageDefaultAdminSeeded();
  })().finally(() => {
    initializationPromise = null;
  });

  return initializationPromise;
}

export async function persistOfflineCredential(user: User, password: string) {
  await initializeOfflineAuthStorage();

  if (usesSqliteCredentialStore()) {
    const existing = await getSqliteOfflineAuthRecordByEmail(user.email);
    const record = await createRecord(user, password, { existing });
    await upsertSqliteOfflineAuthRecord(record);
    return;
  }

  const existing = await getLocalStorageOfflineAuthRecordByEmail(user.email);
  const record = await createRecord(user, password, { existing });
  const records = readLocalStorageRecords().filter(
    (currentRecord) => currentRecord.email !== record.email,
  );
  writeLocalStorageRecords([record, ...records]);
}

export async function authenticateOfflineCredential(
  email: string,
  password: string,
): Promise<OfflineAuthVerificationResult> {
  await initializeOfflineAuthStorage();

  if (usesSqliteCredentialStore()) {
    const record = await getSqliteOfflineAuthRecordByEmail(email);
    return verifyOfflineAuthRecord(record, password);
  }

  const record = await getLocalStorageOfflineAuthRecordByEmail(email);
  return verifyOfflineAuthRecord(record, password);
}

export async function hasOfflineCredential(email: string) {
  await initializeOfflineAuthStorage();

  if (usesSqliteCredentialStore()) {
    return (await getSqliteOfflineAuthRecordByEmail(email)) !== null;
  }

  return (await getLocalStorageOfflineAuthRecordByEmail(email)) !== null;
}
