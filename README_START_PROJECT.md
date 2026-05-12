# ClientAdvance — Project Startup Guide

This guide explains how to start the full project in development mode.

## Project parts

The project contains:

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Docker
- **ORM**: Prisma
- **Desktop app**: Tauri + SQLite
- **Sync mode**: Offline-first local data with manual backend sync

---

## 1. Requirements

Install these first:

- Node.js
- npm
- Docker Desktop
- Git
- Rust/Cargo for Tauri

Check versions:

```powershell
node --version
npm --version
docker --version
docker compose version
rustc --version
cargo --version
```

If `cargo` is not recognized, add Rust to the current terminal PATH:

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
```

---

## 2. Start PostgreSQL with Docker

From the project root:

```powershell
cd C:\Users\MSI-PC\dyad-apps\gestion-facile
docker compose up -d
```

Check containers:

```powershell
docker ps
```

You should see:

- `gestion_clients_postgres`
- `gestion_clients_pgadmin`

pgAdmin is available at:

```text
http://localhost:5050
```

pgAdmin login:

```text
Email: admin@demo.com
Password: admin123
```

PostgreSQL connection inside pgAdmin:

```text
Host: postgres
Port: 5432
Database: gestion_facile
User: postgres
Password: postgres
```

---

## 3. Backend environment file

Create this file:

```text
server/.env
```

Content:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gestion_facile"
PORT=4000
JWT_SECRET="change_this_secret_dev_only"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:8080"
```

Do not commit `server/.env`.

---

## 4. Install and prepare backend

Open a terminal:

```powershell
cd C:\Users\MSI-PC\dyad-apps\gestion-facile\server
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

Seeded users:

```text
Admin:
email: admin@demo.com
password: admin123

Employee:
email: employe@demo.com
password: employe123
```

---

## 5. Start backend

In the `server` folder:

```powershell
npm run dev
```

Expected:

```text
ClientAdvance App API listening on http://localhost:4000
```

Test backend health in another terminal:

```powershell
curl.exe http://localhost:4000/api/health
```

Expected:

```json
{"ok":true,"service":"ClientAdvance App API"}
```

Test login with PowerShell:

```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@demo.com","password":"admin123"}'
```

---

## 6. Frontend environment file

Create this file in the project root:

```text
.env
```

For normal browser development:

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_USE_LOCAL_AUTH=false
VITE_STORAGE_DRIVER=localStorage
```

Do not commit `.env`.

---

## 7. Start frontend in browser mode

Open another terminal from the project root:

```powershell
cd C:\Users\MSI-PC\dyad-apps\gestion-facile
npm install
npm run dev
```

Open:

```text
http://localhost:8080
```

Login with:

```text
admin@demo.com / admin123
employe@demo.com / employe123
```

---

## 8. Manual sync test in browser mode

1. Login as admin.
2. Go to **Clients**.
3. Add a new client.
4. Confirm the client has sync status **En attente**.
5. Click **Synchroniser maintenant**.
6. Confirm it becomes **Synchronisé**.
7. Check PostgreSQL in pgAdmin:

```sql
select id, nom_complet, deleted_at, remote_updated_at
from clients
order by remote_updated_at desc;
```

---

## 9. Start desktop app with Tauri + SQLite

Make sure backend is running first.

Open a terminal from the project root:

```powershell
cd C:\Users\MSI-PC\dyad-apps\gestion-facile

$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
$env:VITE_STORAGE_DRIVER="sqlite"
$env:VITE_API_BASE_URL="http://localhost:4000/api"
$env:VITE_USE_LOCAL_AUTH="false"

npm run tauri:dev
```

The desktop app should open.

---

## 10. SQLite persistence test

Inside the Tauri desktop window:

1. Login as admin.
2. Go to **Clients**.
3. Add a client named `Test SQLite`.
4. Confirm it appears as **En attente**.
5. Close the Tauri app completely.
6. Start Tauri again with the same command.
7. Confirm `Test SQLite` is still there.

If the client remains after restart, SQLite persistence works.

---

## 11. Useful commands

Start Docker:

```powershell
docker compose up -d
```

Stop Docker containers:

```powershell
docker compose down
```

Reset database completely:

```powershell
docker compose down -v
docker compose up -d
cd server
npx prisma migrate dev --name init
npx prisma db seed
```

Start backend:

```powershell
cd server
npm run dev
```

Start browser frontend:

```powershell
npm run dev
```

Start Tauri desktop app:

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
$env:VITE_STORAGE_DRIVER="sqlite"
$env:VITE_API_BASE_URL="http://localhost:4000/api"
$env:VITE_USE_LOCAL_AUTH="false"
npm run tauri:dev
```

---

## 12. Git safety

Do not commit:

```text
.env
server/.env
node_modules/
server/node_modules/
src-tauri/target/
src-tauri/gen/schemas/
```

Commit:

```text
.env.example
server/.env.example
docker-compose.yml
server/prisma/migrations/
src-tauri/Cargo.lock
src-tauri/icons/
```

---

## 13. Current project status

Completed:

- Backend Express API
- PostgreSQL Docker setup
- Prisma migrations and seed
- Backend authentication
- Frontend authentication using backend JWT
- Manual backend sync
- Automatic online/offline status
- Tauri shell
- SQLite foundation
- SQLite repositories
- Cache-backed SQLite services
- Tauri app icon

Remaining work:

- Full manual testing of SQLite mode
- Direct SQLite-aware sync implementation instead of temporary localStorage sync bridge
- Optional localStorage-to-SQLite migration
- Windows installer build



admin@demo.com / admin123


Ctrl + Alt + M  -> Prisma: Migrate + Generate All
Ctrl + Alt + 1  -> Run App Server
Ctrl + Alt + 2  -> Run Owner Server
Ctrl + Alt + 3  -> Run Owner Portal
Ctrl + Alt + 4  -> Run App Server + Owner Server + Owner Portal together
