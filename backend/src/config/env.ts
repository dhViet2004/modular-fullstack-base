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
  })
  .transform((values) => ({
    ...values,
    PUBLIC_WEB_URL: values.PUBLIC_WEB_URL ?? "http://localhost:3000",
    SMTP_HOST: values.SMTP_HOST ?? "localhost",
    MAIL_FROM: values.MAIL_FROM ?? "CoreStack <no-reply@localhost>",
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
