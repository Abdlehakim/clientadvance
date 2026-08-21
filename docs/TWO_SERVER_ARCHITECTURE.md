# Two Server Architecture

## Purpose

The backend is split into two independent Node/Express projects:

- `services/owner-api/`: private API for the software owner portal.
- `services/app-api/`: customer-facing API for the desktop/web app.

Both servers use the same PostgreSQL database in Phase 1.

## services/owner-api

Local URL: `http://localhost:4100`

Mounted routes:

- `GET /api/health`
- `/api/admin/companies`
- `/api/admin/licenses`
- `/api/admin/users`

Security boundary:

- Protected with `x-owner-admin-key`.
- Uses `OWNER_ADMIN_KEY`.
- CORS is limited to `OWNER_PORTAL_URL` and local owner portal dev origins.
- Does not mount customer auth, clients, payments, notifications, or sync APIs.

## services/app-api

Local URL: `http://localhost:4000`

Mounted routes:

- `GET /api/health`
- `/api/auth`
- `/api/licenses/activate`
- `/api/licenses/check`
- `/api/users`
- `/api/clients`
- `/api/payments`
- `/api/admin-settings`
- `/api/activity-logs`
- `/api/notifications`
- `/api/sync`

Security boundary:

- Uses customer JWT authentication.
- CORS is limited to customer web/Tauri origins.
- Does not mount `/api/admin/*` owner APIs.
- Does not load `OWNER_ADMIN_KEY`.

## Shared Database

Phase 1 keeps one shared PostgreSQL database:

- `services/owner-api` creates and manages companies, company admins, licenses, and activations.
- `services/app-api` authenticates company users, handles business data, and verifies licenses.

This avoids schema migration and service-to-service calls during the physical split.

## Prisma

Current approach: temporary duplicated Prisma folders.

- `services/app-api/prisma`
- `services/owner-api/prisma`

Both contain the same schema and migration history so each project can generate its own Prisma Client against the shared database.

Run migrations from `services/app-api` only for now:

```bash
npm --prefix services/app-api run prisma:migrate
```

Do not run migrations from both projects. A later phase should move Prisma to a shared package, for example `shared/prisma/`, or split databases with explicit service contracts.

## Local Development

From the repository root:

```bash
npm --prefix services/app-api run dev
npm --prefix services/owner-api run dev
npm --prefix apps/admin run dev
npm --prefix apps/desktop run dev
```

Direct project commands:

```bash
npm --prefix services/app-api run dev
npm --prefix services/owner-api run dev
npm --prefix apps/admin run dev
```

Expected local URLs:

- services/app-api: `http://localhost:4000`
- services/owner-api: `http://localhost:4100`
- apps/admin: `http://localhost:4174`
- customer app: existing Vite/Tauri dev URL

## Environment URLs

Owner portal:

```bash
VITE_API_BASE_URL=http://localhost:4100/api
```

Customer app:

```bash
VITE_API_BASE_URL=http://localhost:4000/api
```

## Deployment Domains

Recommended deployment shape:

- Owner portal: `owner.yourdomain.com`
- Owner API: `owner-api.yourdomain.com`
- Customer API: `api.yourdomain.com`

Keep owner API CORS limited to the owner portal domain. Keep customer API CORS limited to customer web/Tauri origins.

## Manual Route Isolation Checks

```bash
curl http://localhost:4000/api/health
curl http://localhost:4100/api/health
```

Owner route must exist only on the owner API:

```bash
curl -H "x-owner-admin-key: <key>" http://localhost:4100/api/admin/licenses
curl http://localhost:4000/api/admin/licenses
```

The first request should reach the owner API. The second should return `404`.

Customer route must exist only on the app API:

```bash
curl -X POST http://localhost:4000/api/auth/login
curl -X POST http://localhost:4100/api/auth/login
```

The app API request should reach the auth route. The owner API request should return `404`.
