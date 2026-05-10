# Prisma Ownership

Phase 1 uses one shared PostgreSQL database while `app-server` and `owner-server`
are separate backend projects.

Run Prisma migrations from this `app-server` project only for now:

```bash
npm --prefix app-server run prisma:migrate
```

The `owner-server/prisma` folder is a temporary duplicate so both projects can
generate Prisma Client against the same schema. Move this to a shared Prisma
package before splitting databases.
