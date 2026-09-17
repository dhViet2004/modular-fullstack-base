import { Router } from "express";
import { authRateLimit } from "../../../middleware/rate-limit.middleware.js";
import { validate } from "../../../middleware/validate.middleware.js";
import { googleOAuthController as controller } from "./google-oauth.controller.js";
import { googleOAuthExchangeSchema } from "./google-oauth.schema.js";

export const googleOAuthRoutes=Router();
googleOAuthRoutes.get("/",controller.authorize);
googleOAuthRoutes.get("/callback",controller.callback);
googleOAuthRoutes.post("/exchange",authRateLimit,validate(googleOAuthExchangeSchema),controller.exchange);
