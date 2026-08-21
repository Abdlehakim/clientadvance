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

Repository layout:

```text
apps/
  customer/       Customer browser dashboard
  admin/          Owner/admin dashboard
  desktop/        Customer Tauri desktop app
services/
  app-api/        Customer-facing API (port 4000)
  owner-api/      Owner/admin API (port 4100)
```

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
cd C:\Users\MSI-PC\Desktop\clientadvance
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
services/app-api/.env
```

Content:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gestion_facile"
PORT=4000
JWT_SECRET="change_this_secret_dev_only"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:8080"
```

Do not commit `services/app-api/.env`.

---

## 4. Install and prepare backend

Open a terminal:

```powershell
cd C:\Users\MSI-PC\Desktop\clientadvance\services\app-api
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

In the `services/app-api` folder:

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

Create this file in the customer web application:

```text
apps/customer/.env
```

For normal browser development:

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_USE_LOCAL_AUTH=false
VITE_STORAGE_DRIVER=localStorage
```

Do not commit `apps/customer/.env`.

---

## 7. Start frontend in browser mode

Open another terminal from the project root:

```powershell
cd C:\Users\MSI-PC\Desktop\clientadvance\apps\customer
npm install
npm run dev
```

Open:

```text
http://localhost:5173
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
cd C:\Users\MSI-PC\Desktop\clientadvance\apps\desktop

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
cd services/app-api
npx prisma migrate dev --name init
npx prisma db seed
```

Start backend:

```powershell
cd services/app-api
npm run dev
```

Start customer browser dashboard:

```powershell
cd apps/customer
npm run dev
```

Start Tauri desktop app:

```powershell
cd apps/desktop
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
services/app-api/.env
node_modules/
services/app-api/node_modules/
apps/desktop/src-tauri/target/
apps/desktop/src-tauri/gen/schemas/
```

Commit:

```text
.env.example
services/app-api/.env.example
docker-compose.yml
services/app-api/prisma/migrations/
apps/desktop/src-tauri/Cargo.lock
apps/desktop/src-tauri/icons/
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

## Clone the project

Open PowerShell and run:

```powershell
cd C:\Users\MSI-PC\Desktop
git clone --recurse-submodules https://github.com/Abdlehakim/clientadvance.git
cd clientadvance
git submodule status
```
