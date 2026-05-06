# Tauri + SQLite Implementation Foundation

This document describes the desktop foundation added for the next phase of
`Gestion Facile / Gestion Clients & Paiements`.

## Current Status

- Browser/dev mode still uses `localStorage` as the active storage driver.
- A Tauri desktop shell has been added under `src-tauri/`.
- A real SQLite foundation now exists:
  - database file creation/opening
  - schema initialization
  - typed frontend invoke helpers
  - generic `query` / `execute` commands exposed from Rust
- The SQLite repositories are **not** the active repositories yet.

## Tauri Prerequisites

Follow the official Tauri prerequisites guide first:

- Tauri v2 prerequisites: https://v2.tauri.app/start/prerequisites/

For Windows, the main prerequisites are:

- Rust via `rustup`
- Microsoft Visual C++ Build Tools
- Microsoft Edge WebView2 runtime

## Install Desktop Dependencies

Once the machine prerequisites are installed, install project dependencies:

```bash
npm install
```

This will make the `tauri` CLI script available from `package.json`.

## Desktop Dev Mode

Start the desktop shell with:

```bash
npm run tauri:dev
```

The Tauri config currently expects the existing frontend dev server at:

- `http://localhost:8080`

The desktop build config points Tauri at:

- `dist/client`

That matches the current TanStack Start output layout.

## SQLite Database Location

The desktop shell creates a SQLite file named:

- `gestion-facile.db`

It is stored in the Tauri app data directory for the current user.

Typical locations:

- Windows: `%AppData%/com.gestionfacile.desktop/gestion-facile.db`
- macOS: `~/Library/Application Support/com.gestionfacile.desktop/gestion-facile.db`
- Linux: `~/.local/share/com.gestionfacile.desktop/gestion-facile.db`

The exact resolved path is returned by the Rust `sqlite_init` command.

## SQLite Foundation Added

The Rust layer now creates these tables if they do not exist:

- `clients`
- `payments`
- `admin_settings`
- `activity_logs`
- `notification_queue`
- `app_state`

Important offline/sync fields included in the schema:

- `pending_sync`
- `sync_status`
- `remote_updated_at`
- `deleted_at` on `clients`
- `last_sync` stored in `app_state`

## Frontend SQLite Access Layer

`src/infrastructure/local/sqlite/sqliteClient.ts` now provides:

- `initializeSqliteDatabase()`
- `sqliteExecute(sql, params)`
- `sqliteQuery(sql, params)`
- `getDb()`
- `isTauriRuntime()`

These helpers call the Tauri Rust commands:

- `sqlite_init`
- `sqlite_execute`
- `sqlite_query`

## Storage Driver Switch

`appServices.ts` now exposes a prepared storage switch:

- `VITE_STORAGE_DRIVER=localStorage`
- `VITE_STORAGE_DRIVER=sqlite`

Current behavior:

- `localStorage` is still the default and active CRUD storage path
- `sqlite` only initializes the SQLite foundation when running inside Tauri
- repository switching has **not** happened yet

## What Remains Before Replacing localStorage

The next exact step is:

1. Implement the SQLite repositories in `src/infrastructure/local/sqlite/*.ts`
   against the real `sqliteClient.ts` helpers.
2. Keep the same repository contracts and offline-first behavior.
3. Add one repository at a time:
   - `clientSQLiteRepository`
   - `paymentSQLiteRepository`
   - `adminSettingsSQLiteRepository`
   - `activityLogSQLiteRepository`
   - `notificationSQLiteRepository`
4. After those repositories are complete, switch `appServices.ts` to select the
   repository set from `VITE_STORAGE_DRIVER`.
5. After that, add migration/import from existing browser `localStorage` into
   SQLite for desktop users.

## Reference Docs

- Tauri v2 prerequisites: https://v2.tauri.app/start/prerequisites/
- Tauri v2 configuration: https://v2.tauri.app/reference/config/
- Calling Rust commands from the frontend: https://v2.tauri.app/develop/calling-rust/
