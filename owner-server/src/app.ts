import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

interface CorsOptionsInput {
  allowedOrigins: string[];
  allowedHeaders: string[];
}

interface BaseAppOptions {
  serviceName: string;
  corsOptions: cors.CorsOptions;
}

export function normalizeOrigin(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function createAllowedOrigins(origins: string[]) {
  return new Set(
    origins
      .map(normalizeOrigin)
      .filter((value) => value.length > 0),
  );
}

export function createCorsOptions({
  allowedOrigins,
  allowedHeaders,
}: CorsOptionsInput): cors.CorsOptions {
  const normalizedAllowedOrigins = createAllowedOrigins(allowedOrigins);

  return {
    origin(origin, callback) {
      if (!origin || normalizedAllowedOrigins.has(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders,
    optionsSuccessStatus: 204,
  };
}

export function createBaseApp({ serviceName, corsOptions }: BaseAppOptions) {
  const app = express();

  app.use(helmet());
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(morgan("dev"));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: serviceName });
  });

  return app;
}
