import type { Request,RequestHandler } from "express";
import { env } from "../../../config/env.js";
import { success } from "../../../core/http/api-response.js";
import { authService } from "../../auth/auth.service.js";
import { oauthHandoffService } from "../oauth-handoff.service.js";
import { googleOAuthStrategy } from "./google-oauth.strategy.js";

const info=(req:Request)=>({ipAddress:req.ip,userAgent:req.header("user-agent"),fingerprint:req.query.fingerprint as string|undefined});

export const googleOAuthController:Record<string,RequestHandler>={
  authorize(_req,res,next){try{res.redirect(googleOAuthStrategy.authorize())}catch(error){next(error)}},
  async callback(req, res) {
    try {
      const result = await authService.complete(
        await googleOAuthStrategy.callback(String(req.query.code), String(req.query.state)),
        info(req)
      );
      const code = oauthHandoffService.issue(result);
      res.redirect(`${env.FRONTEND_URL}/auth/google/callback?code=${encodeURIComponent(code)}`);
    } catch (error: any) {
      console.error("[Google OAuth Error]:", error?.code, error?.message || error);
      const errCode = error?.code ? String(error.code).toLowerCase() : "google_auth_failed";
      res.redirect(`${env.FRONTEND_URL}/auth/google/callback?error=${encodeURIComponent(errCode)}`);
    }
  },
  exchange(req,res,next){try{res.json(success(oauthHandoffService.consume(req.body.code)))}catch(error){next(error)}}
};
