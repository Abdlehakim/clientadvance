use rusqlite::{
  params_from_iter,
  types::{Value as SqlValue, ValueRef},
  Connection,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value as JsonValue};
use std::{collections::HashMap, fs, path::PathBuf};
use tauri::{AppHandle, Manager};

const DATABASE_FILE_NAME: &str = "gestion-facile.db";
const SQLITE_SCHEMA: &str = r#"
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  nom_complet TEXT NOT NULL,
  telephone TEXT NOT NULL DEFAULT '',
  adresse TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  cin TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL DEFAULT '',
  deleted_at TEXT,
  remote_updated_at TEXT,
  pending_sync INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  montant REAL NOT NULL,
  date_paiement TEXT NOT NULL,
  heure_paiement TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  remote_updated_at TEXT,
  pending_sync INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS admin_settings (
  id TEXT PRIMARY KEY,
  admin_email TEXT NOT NULL DEFAULT '',
  admin_whatsapp TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL DEFAULT '',
  remote_updated_at TEXT,
  pending_sync INTEGER NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT '',
  user_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  pending_sync INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS notification_queue (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  payment_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued',
  error_message TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT,
  pending_sync INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS local_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 120000,
  seeded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO app_state (key, value, updated_at)
VALUES ('last_sync', NULL, CURRENT_TIMESTAMP);
"#;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SqliteStatement {
  sql: String,
  #[serde(default)]
  params: Vec<JsonValue>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SqliteDatabaseInfo {
  path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SqliteExecuteResult {
  rows_affected: usize,
  last_insert_rowid: i64,
}

fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
  let app_data_dir = app
    .path()
    .app_data_dir()
    .map_err(|error| error.to_string())?;

  fs::create_dir_all(&app_data_dir).map_err(|error| error.to_string())?;

  Ok(app_data_dir.join(DATABASE_FILE_NAME))
}

fn open_database(app: &AppHandle) -> Result<(Connection, PathBuf), String> {
  let path = database_path(app)?;
  let connection = Connection::open(&path).map_err(|error| error.to_string())?;

  connection
    .execute_batch(SQLITE_SCHEMA)
    .map_err(|error| error.to_string())?;

  Ok((connection, path))
}

fn json_to_sql_value(value: JsonValue) -> Result<SqlValue, String> {
  match value {
    JsonValue::Null => Ok(SqlValue::Null),
    JsonValue::Bool(inner) => Ok(SqlValue::Integer(if inner { 1 } else { 0 })),
    JsonValue::Number(inner) => {
      if let Some(value) = inner.as_i64() {
        Ok(SqlValue::Integer(value))
      } else if let Some(value) = inner.as_u64() {
        let converted =
          i64::try_from(value).map_err(|_| "SQLite integer parameter is out of range".to_string())?;
        Ok(SqlValue::Integer(converted))
      } else if let Some(value) = inner.as_f64() {
        Ok(SqlValue::Real(value))
      } else {
        Err("Unsupported SQLite numeric parameter".to_string())
      }
    }
    JsonValue::String(inner) => Ok(SqlValue::Text(inner)),
    JsonValue::Array(_) | JsonValue::Object(_) => {
      Err("SQLite parameters must be scalar values".to_string())
    }
  }
}

fn row_value_to_json(value: ValueRef<'_>) -> JsonValue {
  match value {
    ValueRef::Null => JsonValue::Null,
    ValueRef::Integer(inner) => json!(inner),
    ValueRef::Real(inner) => json!(inner),
    ValueRef::Text(inner) => JsonValue::String(String::from_utf8_lossy(inner).into_owned()),
    ValueRef::Blob(inner) => JsonValue::Array(inner.iter().map(|byte| json!(byte)).collect()),
  }
}

#[tauri::command]
fn sqlite_init(app: AppHandle) -> Result<SqliteDatabaseInfo, String> {
  let (_connection, path) = open_database(&app)?;

  Ok(SqliteDatabaseInfo {
    path: path.to_string_lossy().into_owned(),
  })
}

#[tauri::command]
fn sqlite_execute(app: AppHandle, statement: SqliteStatement) -> Result<SqliteExecuteResult, String> {
  let (connection, _path) = open_database(&app)?;
  let params = statement
    .params
    .into_iter()
    .map(json_to_sql_value)
    .collect::<Result<Vec<_>, _>>()?;
  let rows_affected = connection
    .execute(&statement.sql, params_from_iter(params.iter()))
    .map_err(|error| error.to_string())?;

  Ok(SqliteExecuteResult {
    rows_affected,
    last_insert_rowid: connection.last_insert_rowid(),
  })
}

#[tauri::command]
fn sqlite_query(app: AppHandle, statement: SqliteStatement) -> Result<Vec<HashMap<String, JsonValue>>, String> {
  let (connection, _path) = open_database(&app)?;
  let params = statement
    .params
    .into_iter()
    .map(json_to_sql_value)
    .collect::<Result<Vec<_>, _>>()?;
  let mut prepared = connection
    .prepare(&statement.sql)
    .map_err(|error| error.to_string())?;
  let column_names = prepared
    .column_names()
    .into_iter()
    .map(|value| value.to_string())
    .collect::<Vec<_>>();
  let mut rows = prepared
    .query(params_from_iter(params.iter()))
    .map_err(|error| error.to_string())?;
  let mut results = Vec::new();

  while let Some(row) = rows.next().map_err(|error| error.to_string())? {
    let mut entry = HashMap::new();

    for (index, column_name) in column_names.iter().enumerate() {
      let value = row
        .get_ref(index)
        .map(row_value_to_json)
        .map_err(|error| error.to_string())?;

      entry.insert(column_name.clone(), value);
    }

    results.push(entry);
  }

  Ok(results)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      sqlite_init,
      sqlite_execute,
      sqlite_query
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
