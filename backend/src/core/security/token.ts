import { SignJWT,jwtVerify } from "jose"; import { env } from "../../config/env.js";
const key=new TextEncoder().encode(env.ACCESS_TOKEN_SECRET);
export const issueAccessToken=(userId:string,sessionId:string)=>new SignJWT({sid:sessionId}).setProtectedHeader({alg:"HS256"}).setSubject(userId).setIssuedAt().setExpirationTime(`${env.ACCESS_TOKEN_TTL_MINUTES}m`).sign(key);
export const verifyAccessToken=(token:string)=>jwtVerify(token,key);
