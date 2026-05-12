# Backend setup

## Stack

- Node.js
- Express
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT authentication
- bcrypt password hashing
- Zod validation
- CORS + Helmet + Morgan

## Files and location

The real backend lives in:

```text
server/
```

## Environment variables

Create a `server/.env` file based on `server/.env.example`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gestion_facile"
PORT=4000
JWT_SECRET="change_this_secret"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:5173"
```

## Run the backend

```bash
cd server
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

The API will run on:

```text
http://localhost:4000
```

## Health check

```bash
curl http://localhost:4000/api/health
```

Expected response:

```json
{
  "ok": true,
  "service": "ClientAdvance App API"
}
```

## Demo accounts seeded

### Admin

- email: `admin@demo.com`
- password: `admin123`

### Employé

- email: `employe@demo.com`
- password: `employe123`

## curl examples

### Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.com",
    "password": "admin123"
  }'
```

### Create client

```bash
curl -X POST http://localhost:4000/api/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "id": "client_demo_001",
    "nom_complet": "Ahmed Ben Ali",
    "telephone": "+212600000001",
    "adresse": "Casablanca",
    "email": "ahmed@example.com",
    "cin": "12345678"
  }'
```

### Create payment

```bash
curl -X POST http://localhost:4000/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "id": "payment_demo_001",
    "client_id": "client_demo_001",
    "montant": 250.5,
    "date_paiement": "2025-01-15",
    "heure_paiement": "14:30"
  }'
```

### Sync push

```bash
curl -X POST http://localhost:4000/api/sync/push \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "clients": [
      {
        "id": "client_sync_001",
        "nom_complet": "Fatima Zahra",
        "telephone": "+212600000002",
        "adresse": "Rabat",
        "email": "fatima@example.com",
        "cin": "87654321",
        "created_at": "2025-01-15T09:00:00.000Z",
        "updated_at": "2025-01-15T09:00:00.000Z",
        "created_by": "u_admin_demo",
        "updated_by": "u_admin_demo",
        "pending_sync": true,
        "sync_status": "pending"
      }
    ],
    "payments": [],
    "adminSettings": null,
    "activityLogs": [],
    "notifications": []
  }'
```

### Sync pull

```bash
curl "http://localhost:4000/api/sync/pull?since=2025-01-01T00:00:00.000Z" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Notes before frontend connection

- The current frontend still uses localStorage/local offline services by default.
- Remote repository files were aligned with the new API shape, but the app has **not** been switched to the backend yet.
- A real remote sync adapter can now be connected progressively without rewriting the frontend architecture.
- Notification endpoints currently create queue records only.
- Real SMTP and WhatsApp Business API delivery workers are still future work.
