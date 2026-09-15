import { env } from "./env.js";
export const authConfig={accessMinutes:env.ACCESS_TOKEN_TTL_MINUTES,refreshDays:env.REFRESH_TOKEN_TTL_DAYS,maxSessions:env.AUTH_MAX_ACTIVE_SESSIONS};
