import { env } from "./env.js";
export const mailConfig={host:env.SMTP_HOST.trim(),port:env.SMTP_PORT,secure:env.SMTP_SECURE,user:env.SMTP_USER.trim(),password:env.SMTP_PASSWORD.replace(/\s/g,""),from:env.MAIL_FROM.trim()};
