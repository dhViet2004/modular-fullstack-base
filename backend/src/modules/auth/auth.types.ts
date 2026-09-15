export type StrategyResult={provider:"PASSWORD"|"GOOGLE"|"EMAIL_OTP"|"MAGIC_LINK";providerAccountId:string;email:string;emailVerified:boolean;userId?:string};
export type RequestInfo={ipAddress?:string;userAgent?:string;fingerprint?:string};
