import type { RequestHandler } from "express";

import { successResponse } from "../../../core/http/api-response.js";
import {
  clearRefreshTokenCookieOptions,
  readRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE_NAME,
  refreshTokenCookieOptions,
} from "./refresh-token-cookie.js";
import {
  getActiveSessions,
  getCurrentUser,
  refreshAuthSession,
  revokeAuthSession,
  revokeUserSession,
} from "./session.service.js";
import { getUserAccessContext } from "../../access/access.service.js";

export const sessionController = {
  me: (async (request, response) => {
    const user = await getCurrentUser(request.auth.user.id);
    const access = await getUserAccessContext(user.id);
    response.json(successResponse({ user, access }));
  }) as RequestHandler,

  refresh: (async (request, response) => {
    const refreshToken = readRefreshTokenCookie(request.headers.cookie);
    const result = await refreshAuthSession(refreshToken ?? "");
    response.cookie(
      REFRESH_TOKEN_COOKIE_NAME,
      result.refreshToken,
      refreshTokenCookieOptions(result.refreshTokenExpiresAt),
    );
    response.json(successResponse({
      accessToken: result.accessToken,
      accessTokenExpiresInSeconds: result.accessTokenExpiresInSeconds,
    }));
  }) as RequestHandler,

  logout: (async (request, response) => {
    const refreshToken = readRefreshTokenCookie(request.headers.cookie);
    await revokeAuthSession(refreshToken ?? "", {
      ipAddress: request.ip ?? null,
      userAgent: request.get("user-agent") ?? null,
    });
    response.clearCookie(REFRESH_TOKEN_COOKIE_NAME, clearRefreshTokenCookieOptions());
    response.status(204).send();
  }) as RequestHandler,

  list: (async (request, response) => {
    const sessions = await getActiveSessions(request.auth.user.id, request.auth.sessionId);
    response.json(successResponse({ sessions }));
  }) as RequestHandler,

  revoke: (async (request, response) => {
    const { id } = response.locals.validatedParams as { id: string };
    await revokeUserSession(request.auth.user.id, id);
    response.status(204).send();
  }) as RequestHandler,
};
