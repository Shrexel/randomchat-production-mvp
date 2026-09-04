import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  // Render provides PORT automatically in production.
  // Locally, it falls back to 4000.
  PORT: z.coerce.number().int().positive().default(4000),

  // Your Vercel frontend URL in production.
  // Example:
  // https://randomchat-production-mvp.vercel.app
  WEB_ORIGIN: z
    .string()
    .url()
    .default("http://localhost:3000"),

  // Production PostgreSQL connection string.
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required"),

  // Secret used by your backend authentication/session system.
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters"),
});

export const config = schema.parse({
  PORT: process.env.PORT,
  WEB_ORIGIN: process.env.WEB_ORIGIN,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
});