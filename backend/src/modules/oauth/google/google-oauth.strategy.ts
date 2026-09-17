import { createHash } from "node:crypto";
import { createRemoteJWKSet,jwtVerify } from "jose";
import { env } from "../../../config/env.js";
import { ApiError } from "../../../core/http/api-error.js";
import { secureToken } from "../../../core/security/random.js";

const states=new Map<string,{verifier:string;expires:number}>();
const googleKeys=createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const b64=(value:Buffer)=>value.toString("base64url");

export const googleOAuthStrategy={
  authorize(){if(!env.GOOGLE_CLIENT_ID||!env.GOOGLE_CLIENT_SECRET)throw new ApiError(503,"GOOGLE_NOT_CONFIGURED","Google OAuth is not configured");const state=secureToken(),verifier=secureToken(48),challenge=b64(createHash("sha256").update(verifier).digest());states.set(state,{verifier,expires:Date.now()+600_000});const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");url.search=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:env.GOOGLE_CALLBACK_URL,response_type:"code",scope:"openid email profile",state,code_challenge:challenge,code_challenge_method:"S256"}).toString();return url.toString()},
  async callback(code:string,state:string){const record=states.get(state);states.delete(state);if(!record||record.expires<Date.now())throw new ApiError(401,"UNAUTHORIZED","Invalid OAuth state");const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uri:env.GOOGLE_CALLBACK_URL,grant_type:"authorization_code",code_verifier:record.verifier})});if(!response.ok)throw new ApiError(401,"INVALID_CREDENTIALS","Google authentication failed");const tokens=await response.json() as {id_token:string};const {payload:profile}=await jwtVerify(tokens.id_token,googleKeys,{issuer:["https://accounts.google.com","accounts.google.com"],audience:env.GOOGLE_CLIENT_ID});if(typeof profile.sub!=="string"||typeof profile.email!=="string"||profile.email_verified!==true)throw new ApiError(401,"UNAUTHORIZED","Google email is not verified");return{provider:"GOOGLE" as const,providerAccountId:profile.sub,email:profile.email,emailVerified:true}}
};
