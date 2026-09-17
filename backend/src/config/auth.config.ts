import { env } from "./env.js";
export const authConfig={accessMinutes:env.ACCESS_TOKEN_TTL_MINUTES,refreshDays:env.REFRESH_TOKEN_TTL_DAYS,maxSessions:env.AUTH_MAX_ACTIVE_SESSIONS};

const csv=(value:string,normalize=false)=>new Set(value.split(",").map((item)=>item.trim()).filter(Boolean).map((item)=>normalize?item.toLowerCase():item));
export const superAdminBootstrapConfig={
  enabled:env.SUPER_ADMIN_BOOTSTRAP_ENABLED,
  provider:env.SUPER_ADMIN_BOOTSTRAP_PROVIDER,
  googleEmails:csv(env.SUPER_ADMIN_GOOGLE_EMAILS,true),
  googleSubjects:csv(env.SUPER_ADMIN_GOOGLE_SUBS),
  once:env.SUPER_ADMIN_BOOTSTRAP_ONCE
};
