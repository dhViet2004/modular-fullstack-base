import { rateLimit } from "express-rate-limit"; import { env } from "../config/env.js";
export const authRateLimit=rateLimit({windowMs:15*60_000,limit:10,standardHeaders:true,legacyHeaders:false,skip:()=>env.NODE_ENV==="test"});
