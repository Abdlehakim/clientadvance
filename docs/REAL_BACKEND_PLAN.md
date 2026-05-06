# Plan : Backend réel (Node.js + PostgreSQL)

Ce document décrit la prochaine étape de mise en production : remplacer la
simulation locale par un véritable backend. Le frontend est déjà préparé pour
ce changement (voir `src/domain` et `src/infrastructure/remote`).

## Stack

- **Node.js + Express** (ou Fastify) — API REST sous `/api`
- **PostgreSQL** — base relationnelle
- **JWT** — authentification stateless (`jsonwebtoken`)
- **bcrypt** — hash des mots de passe
- **zod** — validation des entrées
- **nodemailer** — envoi d'emails (SMTP, ex. SendGrid / Mailgun)
- **WhatsApp Cloud API** (Meta) — messages WhatsApp
- **pino** — logs structurés

## Authentification & autorisation

- `POST /api/auth/login` → vérifie email + bcrypt(password) → renvoie `{ user, token }`
- Middleware `requireAuth` : vérifie le JWT et injecte `req.user`
- Middleware `requireRole('admin')` : restreint l'accès admin
  (paramètres, journal des activités, suppression de clients)

## Endpoints principaux

| Méthode | URL                          | Rôle      |
| ------- | ---------------------------- | --------- |
| POST    | `/auth/login`                | public    |
| GET     | `/clients`                   | auth      |
| POST    | `/clients`                   | auth      |
| PUT     | `/clients/:id`               | auth      |
| DELETE  | `/clients/:id`               | admin     |
| GET     | `/payments`                  | auth      |
| POST    | `/payments`                  | auth      |
| GET     | `/admin-settings`            | admin     |
| PUT     | `/admin-settings`            | admin     |
| GET     | `/activity-logs`             | admin     |
| POST    | `/sync/push`                 | auth      |
| GET     | `/sync/pull?since=...`       | auth      |
| POST    | `/notifications/email`       | auth      |
| POST    | `/notifications/whatsapp`    | auth      |

## Tables PostgreSQL

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin','employe')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_complet TEXT NOT NULL,
  telephone   TEXT,
  adresse     TEXT,
  email       TEXT,
  cin         TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  created_by  UUID REFERENCES users(id),
  updated_by  UUID REFERENCES users(id),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  montant        NUMERIC(12,3) NOT NULL,
  date_paiement  DATE NOT NULL,
  heure_paiement TIME NOT NULL,
  created_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE admin_settings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email    TEXT,
  admin_whatsapp TEXT,
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  user_name   TEXT,
  action_type TEXT NOT NULL,
  description TEXT,
  entity_type TEXT,
  entity_id   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE notification_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT CHECK (type IN ('email','whatsapp')),
  recipient   TEXT NOT NULL,
  subject     TEXT,
  body        TEXT NOT NULL,
  payment_id  UUID REFERENCES payments(id),
  status      TEXT DEFAULT 'queued' CHECK (status IN ('queued','sent','failed')),
  attempts    INT DEFAULT 0,
  last_error  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  sent_at     TIMESTAMPTZ
);

CREATE TABLE sync_state (
  device_id   TEXT PRIMARY KEY,
  user_id     UUID REFERENCES users(id),
  last_pull   TIMESTAMPTZ,
  last_push   TIMESTAMPTZ
);
```

## Synchronisation

- Le client SQLite (Tauri) garde `pending_sync = true` sur les enregistrements
  modifiés hors ligne.
- `POST /sync/push` reçoit `{ clients: [...], payments: [...], settings, logs, notifications }`
  → upsert côté Postgres + retourne la liste des IDs acceptés/refusés.
- `GET /sync/pull?since=<timestamp>` renvoie les modifications serveur depuis
  `sync_state.last_pull`.
- L'API exécute aussi un worker qui traite `notification_queue` (status='queued').

## Variables d'environnement

```
PORT=4000
DATABASE_URL=postgres://...
JWT_SECRET=...
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_ID=...
```

Côté frontend :
```
VITE_API_BASE_URL=http://localhost:4000/api
```
