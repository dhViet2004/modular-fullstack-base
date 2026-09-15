import { randomBytes,randomInt } from "node:crypto";
export const secureToken=(bytes=32)=>randomBytes(bytes).toString("base64url");
export const secureOtp=()=>randomInt(0,1_000_000).toString().padStart(6,"0");
