import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3001),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(32)
});

export const config = schema.parse(process.env);
