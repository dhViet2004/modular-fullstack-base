import { env } from "./env.js";
export const mailConfig={host:env.SMTP_HOST,port:env.SMTP_PORT,secure:env.SMTP_SECURE,user:env.SMTP_USER,password:env.SMTP_PASSWORD,from:env.MAIL_FROM};
