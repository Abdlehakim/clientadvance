import { createBaseApp, createCorsOptions } from "./app.js";
import { env } from "./config/env.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { roleMiddleware } from "./middleware/roleMiddleware.js";
import { activityLogsRouter } from "./modules/activityLogs/activityLogs.routes.js";
import { adminSettingsRouter } from "./modules/adminSettings/adminSettings.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { clientsRouter } from "./modules/clients/clients.routes.js";
import { licensesRouter } from "./modules/licenses/licenses.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { paymentsRouter } from "./modules/payments/payments.routes.js";
import { syncRouter } from "./modules/sync/sync.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

const appServerCorsOptions = createCorsOptions({
  allowedOrigins: [
    env.FRONTEND_URL,
    "http://localhost:8080",
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:1420",
    "http://tauri.localhost",
    "tauri://localhost",
  ],
  allowedHeaders: ["Content-Type", "Authorization"],
});

export const appServerApp = createBaseApp({
  serviceName: "Gestion Facile App API",
  corsOptions: appServerCorsOptions,
});

appServerApp.use("/api/auth", authRouter);
appServerApp.use("/api/licenses", licensesRouter);
appServerApp.use("/api/users", authMiddleware, roleMiddleware("admin"), usersRouter);
appServerApp.use("/api/clients", authMiddleware, clientsRouter);
appServerApp.use("/api/payments", authMiddleware, paymentsRouter);
appServerApp.use(
  "/api/admin-settings",
  authMiddleware,
  roleMiddleware("admin"),
  adminSettingsRouter,
);
appServerApp.use(
  "/api/activity-logs",
  authMiddleware,
  roleMiddleware("admin"),
  activityLogsRouter,
);
appServerApp.use("/api/notifications", authMiddleware, notificationsRouter);
appServerApp.use("/api/sync", authMiddleware, syncRouter);

appServerApp.use(errorMiddleware);
