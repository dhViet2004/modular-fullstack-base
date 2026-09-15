import { challengeService } from "../challenges/challenge.service.js"; import type { StrategyResult } from "../auth.types.js";
export const otpStrategy={async authenticate(email:string,otp:string):Promise<StrategyResult>{const c=await challengeService.verify(email,"LOGIN_OTP",otp);return{provider:"EMAIL_OTP",providerAccountId:email,email,emailVerified:true,userId:c.userId??undefined};}};
