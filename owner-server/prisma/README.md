# Prisma Ownership

Phase 1 uses one shared PostgreSQL database while `app-server` and `owner-server`
are separate backend projects.

Do not run migrations from `owner-server` for now. Run them from `app-server`
instead:

```bash
npm --prefix app-server run prisma:migrate
```

This folder is a temporary duplicate so `owner-server` can generate Prisma
Client against the same schema. Move Prisma to a shared package before splitting
databases.
