# Plan : Application desktop Tauri + SQLite

Cible : transformer l'application web React en exécutable Windows/macOS/Linux
qui fonctionne hors ligne avec SQLite, puis se synchronise avec l'API Node.js.

## 1. Empaquetage Tauri

```bash
cd apps/desktop
bun add -D @tauri-apps/cli
bunx tauri init
```

- Le bundle Vite existant (`bun run build`) sert d'`distDir`.
- Tauri lance Vite en dev (`bunx tauri dev`) et empaquette en prod
  (`bunx tauri build` → installeur `.msi` / `.dmg` / `.AppImage`).

## 2. Plugin SQLite

```bash
bun add @tauri-apps/plugin-sql
# Côté Rust : tauri-plugin-sql
```

- Activer le plugin dans `apps/desktop/src-tauri/src/main.rs`.
- Le fichier `gestion.db` est créé dans le dossier de données de l'app.

## 3. Schéma SQLite (miroir de PostgreSQL côté serveur)

```sql
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  nom_complet TEXT NOT NULL,
  telephone TEXT, adresse TEXT, email TEXT, cin TEXT,
  created_at TEXT, updated_at TEXT,
  created_by TEXT, updated_by TEXT,
  pending_sync INTEGER DEFAULT 1,
  sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  montant REAL NOT NULL,
  date_paiement TEXT NOT NULL,
  heure_paiement TEXT NOT NULL,
  created_by TEXT, created_at TEXT,
  pending_sync INTEGER DEFAULT 1,
  sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE admin_settings (
  id TEXT PRIMARY KEY,
  admin_email TEXT, admin_whatsapp TEXT, updated_at TEXT,
  pending_sync INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT, user_name TEXT,
  action_type TEXT, description TEXT,
  entity_type TEXT, entity_id TEXT,
  created_at TEXT
);

CREATE TABLE notification_queue (
  id TEXT PRIMARY KEY,
  type TEXT CHECK (type IN ('email','whatsapp')),
  recipient TEXT, subject TEXT, body TEXT,
  payment_id TEXT, status TEXT DEFAULT 'queued',
  created_at TEXT
);
```

## 4. Substitution des adapters

Les fichiers placeholder existent déjà :
`apps/desktop/src/infrastructure/local/sqlite/*.ts`. Ils implémentent
`ClientRepository`, `PaymentRepository`, etc. Pour activer SQLite il suffit
de modifier **un seul fichier**, `apps/desktop/src/services/appServices.ts`, et de
remplacer les imports `*LocalRepository` par `*SQLiteRepository`.

## 5. Offline / online

- `pending_sync = 1` sur chaque INSERT/UPDATE local.
- `sync_status` ∈ `local | pending | synced | failed`.
- Au démarrage, si la connexion est OK, déclencher `syncService.syncPendingData()`.
- Reproduire le mode "Hors ligne" via Tauri `navigator.onLine` ou un toggle UI.

## 6. Sécurité

- Stocker le JWT dans le keyring Tauri (`@tauri-apps/plugin-stronghold` ou
  Keytar) — pas dans `localStorage`.
- Empêcher l'ouverture d'URLs externes non autorisées (config `tauri.conf.json`).

## 7. Build & distribution

```bash
cd apps/desktop
bunx tauri build
# → installeurs dans apps/desktop/src-tauri/target/release/bundle/
```
