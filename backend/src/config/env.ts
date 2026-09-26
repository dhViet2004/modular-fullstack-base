import "dotenv/config";
import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    PORT: z.coerce.number().int().positive().default(4000),

    DATABASE_URL: z.string().min(1),

    CORS_ORIGIN: z.string().url().default("http://localhost:3000"),

    PUBLIC_WEB_URL: z.string().url().optional(),

    JWT_PRIVATE_KEY_BASE64: z.string().min(1),

    JWT_PUBLIC_KEY_BASE64: z.string().min(1),

    JWT_ISSUER: z.string().min(1).default("corestack-api"),

    JWT_AUDIENCE: z.string().min(1).default("corestack-web"),

    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),

    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

    MAX_ACTIVE_SESSIONS_PER_USER: z.coerce.number().int().positive().default(5),

    EMAIL_VERIFICATION_TTL_MINUTES: z.coerce
      .number()
      .int()
      .positive()
      .default(60),

    EMAIL_VERIFICATION_COOLDOWN_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(60),

    SMTP_HOST: optionalNonEmptyString,

    SMTP_PORT: z.coerce.number().int().positive().default(1025),

    SMTP_SECURE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),

    SMTP_USER: optionalNonEmptyString,

    SMTP_PASSWORD: optionalNonEmptyString,

    MAIL_FROM: optionalNonEmptyString,

    GOOGLE_CLIENT_ID: optionalNonEmptyString,

    GOOGLE_CLIENT_SECRET: optionalNonEmptyString,

    GOOGLE_REDIRECT_URI: z.string().url().optional(),

    GOOGLE_OAUTH_ATTEMPT_TTL_MINUTES: z.coerce
      .number()
      .int()
      .positive()
      .default(10),

    STORAGE_R2_ENDPOINT: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().url().optional(),
    ),
    STORAGE_R2_BUCKET: optionalNonEmptyString,
    STORAGE_R2_ACCESS_KEY_ID: optionalNonEmptyString,
    STORAGE_R2_SECRET_ACCESS_KEY: optionalNonEmptyString,
  })
  .superRefine((values, context) => {
    if (values.NODE_ENV === "production" && !values.PUBLIC_WEB_URL) {
      context.addIssue({
        code: "custom",
        path: ["PUBLIC_WEB_URL"],
        message: "PUBLIC_WEB_URL is required in production",
      });
    }

    if (values.NODE_ENV === "production" && !values.SMTP_HOST) {
      context.addIssue({
        code: "custom",
        path: ["SMTP_HOST"],
        message: "SMTP_HOST is required in production",
      });
    }

    if (values.NODE_ENV === "production" && !values.MAIL_FROM) {
      context.addIssue({
        code: "custom",
        path: ["MAIL_FROM"],
        message: "MAIL_FROM is required in production",
      });
    }

    if (Boolean(values.SMTP_USER) !== Boolean(values.SMTP_PASSWORD)) {
      context.addIssue({
        code: "custom",
        path: [values.SMTP_USER ? "SMTP_PASSWORD" : "SMTP_USER"],
        message: "SMTP_USER and SMTP_PASSWORD must be configured together",
      });
    }

    if (
      values.NODE_ENV === "production" &&
      (!values.GOOGLE_CLIENT_ID ||
        !values.GOOGLE_CLIENT_SECRET ||
        !values.GOOGLE_REDIRECT_URI)
    ) {
      context.addIssue({
        code: "custom",
        path: ["GOOGLE_CLIENT_ID"],
        message: "Google OAuth configuration is required in production",
      });
    }

    if (
      values.NODE_ENV === "production" &&
      (!values.STORAGE_R2_ENDPOINT ||
        !values.STORAGE_R2_BUCKET ||
        !values.STORAGE_R2_ACCESS_KEY_ID ||
        !values.STORAGE_R2_SECRET_ACCESS_KEY)
    ) {
      context.addIssue({
        code: "custom",
        path: ["STORAGE_R2_ENDPOINT"],
        message: "Cloudflare R2 configuration is required in production",
      });
    }

    if (
      values.NODE_ENV === "production" &&
      values.STORAGE_R2_ENDPOINT &&
      new URL(values.STORAGE_R2_ENDPOINT).protocol !== "https:"
    ) {
      context.addIssue({
        code: "custom",
        path: ["STORAGE_R2_ENDPOINT"],
        message: "Cloudflare R2 endpoint must use HTTPS",
      });
    }
  })
  .transform((values) => ({
    ...values,
    PUBLIC_WEB_URL: values.PUBLIC_WEB_URL ?? "http://localhost:3000",
    SMTP_HOST: values.SMTP_HOST ?? "localhost",
    MAIL_FROM: values.MAIL_FROM ?? "CoreStack <no-reply@localhost>",
    GOOGLE_REDIRECT_URI:
      values.GOOGLE_REDIRECT_URI ??
      "http://localhost:4000/api/v1/auth/google/callback",
  }));

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Invalid environment configuration",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsed.data;
