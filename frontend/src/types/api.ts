export type ApiResponse<T>={success:true;data:T;meta:Record<string,unknown>};export type ApiFailure={success:false;error:{code:string;message:string;details:unknown}};
