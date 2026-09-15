const redact=(v:unknown)=>JSON.stringify(v,(k,x)=>/password|token|otp|secret/i.test(k)?"[REDACTED]":x);
export const logger={info:(message:string,data?:unknown)=>console.info(message,data?redact(data):""),error:(message:string,data?:unknown)=>console.error(message,data?redact(data):"")};
