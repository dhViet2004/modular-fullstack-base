import { ApiError } from "../../core/http/api-error.js";
import { secureToken } from "../../core/security/random.js";
import type { authService } from "../auth/auth.service.js";

type AuthResult=Awaited<ReturnType<typeof authService.complete>>;
type Handoff={payload:AuthResult;expiresAt:number};

const handoffs=new Map<string,Handoff>();
const ttlMs=60_000;

const prune=()=>{
  const now=Date.now();
  for(const [code,handoff] of handoffs)if(handoff.expiresAt<=now)handoffs.delete(code);
};

export const oauthHandoffService={
  issue(payload:AuthResult){prune();const code=secureToken();handoffs.set(code,{payload,expiresAt:Date.now()+ttlMs});return code},
  consume(code:string){const handoff=handoffs.get(code);handoffs.delete(code);if(!handoff||handoff.expiresAt<=Date.now())throw new ApiError(401,"INVALID_OAUTH_HANDOFF","OAuth handoff is invalid or expired");return handoff.payload}
};
