import { randomUUID } from "node:crypto"; import type { RequestHandler } from "express";
export const requestContext:RequestHandler=(req,res,next)=>{res.locals.requestId=req.header("x-request-id")??randomUUID();res.setHeader("x-request-id",res.locals.requestId);next();};
