import type { RequestHandler } from "express";

import { env } from "../../../config/env.js";
import {
  REFRESH_TOKEN_COOKIE_NAME,
  refreshTokenCookieOptions,
} from "../session/refresh-token-cookie.js";
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

// Callback luôn redirect về frontend; không đưa access token hoặc lỗi Google vào URL.
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

    response.cookie(
      REFRESH_TOKEN_COOKIE_NAME,
      result.session.refreshToken,
      refreshTokenCookieOptions(result.session.refreshTokenExpiresAt),
    );
    response.redirect(callbackSuccessUrl.toString());
  } catch {
    response.redirect(callbackFailureUrl.toString());
  }
};
