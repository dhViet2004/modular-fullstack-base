import type { RequestHandler } from "express";

import { env } from "../../../config/env.js";
import { setRefreshTokenCookie } from "../../../core/http/refresh-token-cookie.js";
import type { GoogleOAuthCallbackQuery } from "./google-oauth.schema.js";
import {
  completeGoogleOAuth,
  recordGoogleOAuthFailure,
  startGoogleOAuth,
} from "./google-oauth.service.js";

const callbackSuccessUrl = new URL(
  "/oauth/google/callback",
  env.PUBLIC_WEB_URL,
);
const callbackFailureUrl = new URL("/login", env.PUBLIC_WEB_URL);
callbackFailureUrl.searchParams.set("error", "google_login_failed");

export const startGoogleOAuthController: RequestHandler = async (
  _request,
  response,
) => {
  response.redirect(await startGoogleOAuth());
};

// Always redirect the callback to the frontend without exposing tokens or provider errors.
export const completeGoogleOAuthController: RequestHandler = async (
  request,
  response,
) => {
  const query = response.locals.validatedQuery as GoogleOAuthCallbackQuery;
  const context = {
    ipAddress: request.ip ?? null,
    userAgent: request.get("user-agent") ?? null,
  };

  if (query.error || !query.code || !query.state) {
    await recordGoogleOAuthFailure(context);
    response.redirect(callbackFailureUrl.toString());
    return;
  }

  try {
    const result = await completeGoogleOAuth(query.code, query.state, context);

    if (result.session.refreshToken) {
      setRefreshTokenCookie(
        response,
        result.session.refreshToken,
        result.session.refreshTokenExpiresAt,
      );
    }
    response.redirect(callbackSuccessUrl.toString());
  } catch (error: unknown) {
    console.error("Google OAuth callback failed", error);
    response.redirect(callbackFailureUrl.toString());
  }
};
