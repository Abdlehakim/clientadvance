import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const portSchema = z.coerce.number().int().positive();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  OWNER_SERVER_PORT: portSchema.default(4100),
  JWT_SECRET: z.string().min(1).default("change_this_secret"),
  OWNER_PORTAL_URL: z.string().url().default("http://localhost:4174"),
  OWNER_ADMIN_KEY: z.string().min(1).default("change-me"),
});

const parsedEnv = envSchema.parse({
  ...process.env,
  OWNER_SERVER_PORT: process.env.OWNER_SERVER_PORT ?? process.env.PORT,
});

export const env = {
  ...parsedEnv,
  PORT: parsedEnv.OWNER_SERVER_PORT,
};
