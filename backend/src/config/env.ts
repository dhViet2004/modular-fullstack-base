import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1),

  CORS_ORIGIN: z.string().url().default("http://localhost:3000"),

  JWT_PRIVATE_KEY_BASE64: z.string().min(1),

  JWT_PUBLIC_KEY_BASE64: z.string().min(1),

  JWT_ISSUER: z.string().min(1).default("corestack-api"),

  JWT_AUDIENCE: z.string().min(1).default("corestack-web"),

  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),

  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Invalid environment configuration",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsed.data;
