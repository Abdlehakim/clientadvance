import { createBaseApp, createCorsOptions } from "./app.js";
import { env } from "./config/env.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { ownerAdminKeyMiddleware } from "./middleware/ownerAdminKeyMiddleware.js";
import { adminCompaniesRouter } from "./modules/companies/companies.admin.routes.js";
import { adminLicensesRouter } from "./modules/licenses/licenses.admin.routes.js";
import { ownerAdminUsersRouter } from "./modules/ownerUsers/ownerUsers.admin.routes.js";

const ownerCorsOptions = createCorsOptions({
  allowedOrigins: [
    env.OWNER_PORTAL_URL,
    "http://localhost:4174",
    "http://localhost:4173",
    "http://localhost:5173",
  ],
  allowedHeaders: ["Content-Type", "x-owner-admin-key"],
});

export const ownerApp = createBaseApp({
  serviceName: "Gestion Facile Owner API",
  corsOptions: ownerCorsOptions,
});

ownerApp.use("/api/admin/companies", ownerAdminKeyMiddleware, adminCompaniesRouter);
ownerApp.use("/api/admin/licenses", ownerAdminKeyMiddleware, adminLicensesRouter);
ownerApp.use("/api/admin/users", ownerAdminKeyMiddleware, ownerAdminUsersRouter);

ownerApp.use(errorMiddleware);
