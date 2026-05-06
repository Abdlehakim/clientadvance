import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { roleMiddleware } from "./middleware/roleMiddleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { clientsRouter } from "./modules/clients/clients.routes.js";
import { paymentsRouter } from "./modules/payments/payments.routes.js";
import { adminSettingsRouter } from "./modules/adminSettings/adminSettings.routes.js";
import { activityLogsRouter } from "./modules/activityLogs/activityLogs.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { syncRouter } from "./modules/sync/sync.routes.js";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "Gestion Clients & Paiements API" });
});

app.use("/api/auth", authRouter);
app.use("/api/users", authMiddleware, roleMiddleware("admin"), usersRouter);
app.use("/api/clients", authMiddleware, clientsRouter);
app.use("/api/payments", authMiddleware, paymentsRouter);
app.use("/api/admin-settings", authMiddleware, roleMiddleware("admin"), adminSettingsRouter);
app.use("/api/activity-logs", authMiddleware, roleMiddleware("admin"), activityLogsRouter);
app.use("/api/notifications", authMiddleware, notificationsRouter);
app.use("/api/sync", authMiddleware, syncRouter);

app.use(errorMiddleware);
