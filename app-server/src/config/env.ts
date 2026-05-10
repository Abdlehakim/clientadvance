import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const portSchema = z.coerce.number().int().positive();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  APP_SERVER_PORT: portSchema.default(4000),
  JWT_SECRET: z.string().min(1).default("change_this_secret"),
  JWT_EXPIRES_IN: z.string().min(1).default("7d"),
  FRONTEND_URL: z.string().url().default("http://localhost:8080"),
  DEFAULT_DEMO_ADMIN_ENABLED: z
    .enum(["true", "false"])
    .optional()
    .default("false"),
});

const parsedEnv = envSchema.parse({
  ...process.env,
  APP_SERVER_PORT: process.env.APP_SERVER_PORT ?? process.env.PORT,
});

export const env = {
  ...parsedEnv,
  PORT: parsedEnv.APP_SERVER_PORT,
};
