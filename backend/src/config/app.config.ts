import { env } from "./env.js";
export const appConfig={port:env.PORT,origin:env.FRONTEND_URL,production:env.NODE_ENV==="production",trustProxy:env.TRUST_PROXY};
