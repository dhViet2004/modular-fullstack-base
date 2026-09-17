import { z } from "zod";
const bool = z.string().default("false").transform((v) => v === "true");
const enabled = z.string().default("true").transform((v) => v === "true");
const schema = z.object({
  NODE_ENV:z.enum(["development","test","production"]).default("development"), PORT:z.coerce.number().default(4000), FRONTEND_URL:z.string().url().default("http://localhost:3000"),
  DATABASE_URL:z.string().default("postgresql://postgres:postgres@localhost:5432/corestack"), ACCESS_TOKEN_SECRET:z.string().min(32).default("development_only_secret_change_me_123"), ACCESS_TOKEN_TTL_MINUTES:z.coerce.number().default(15), REFRESH_TOKEN_TTL_DAYS:z.coerce.number().default(30), AUTH_MAX_ACTIVE_SESSIONS:z.coerce.number().default(5),
  GOOGLE_OAUTH_ENABLED:enabled, GOOGLE_CLIENT_ID:z.string().default(""), GOOGLE_CLIENT_SECRET:z.string().default(""), GOOGLE_CALLBACK_URL:z.string().url().default("http://localhost:4000/api/v1/auth/google/callback"),
  SUPER_ADMIN_BOOTSTRAP_ENABLED:bool, SUPER_ADMIN_BOOTSTRAP_PROVIDER:z.enum(["google"]).default("google"), SUPER_ADMIN_GOOGLE_EMAILS:z.string().default(""), SUPER_ADMIN_GOOGLE_SUBS:z.string().default(""), SUPER_ADMIN_BOOTSTRAP_ONCE:z.string().default("true").transform((v)=>v==="true"),
  SMTP_HOST:z.string().default(""), SMTP_PORT:z.coerce.number().default(587), SMTP_SECURE:bool, SMTP_USER:z.string().default(""), SMTP_PASSWORD:z.string().default(""), MAIL_FROM:z.string().default("no-reply@example.com"),
  STORAGE_DRIVER:z.enum(["local","r2"]).default("local"), LOCAL_STORAGE_PATH:z.string().default("./storage"), R2_ACCOUNT_ID:z.string().default(""), R2_BUCKET:z.string().default(""), R2_ACCESS_KEY_ID:z.string().default(""), R2_SECRET_ACCESS_KEY:z.string().default(""),
  FILE_MAX_SIZE_MB:z.coerce.number().default(20), FILE_ORPHAN_RETENTION_DAYS:z.coerce.number().default(10)
});
export const env = schema.parse(process.env);
