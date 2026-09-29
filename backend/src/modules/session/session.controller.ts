import type { Request, Response } from "express";
import { successResponse } from "../../core/http/api-response.js";
import {
  clearRefreshTokenCookie,
  readRefreshToken,
  setRefreshTokenCookie,
} from "../../core/http/refresh-token-cookie.js";
import { sessionService } from "./session.service.js";

export const sessionController = {
  async me(this: void, request: Request, response: Response) {
    response.json(
      successResponse(await sessionService.me(request.auth.user.id)),
    );
  },

  async refresh(this: void, request: Request, response: Response) {
    const result = await sessionService.refresh(readRefreshToken(request));
    if (result.refreshToken) {
      setRefreshTokenCookie(
        response,
        result.refreshToken,
        result.refreshTokenExpiresAt,
      );
    }
    response.json(
      successResponse({
        accessToken: result.accessToken,
        accessTokenExpiresInSeconds: result.accessTokenExpiresInSeconds,
      }),
    );
  },

  async logout(this: void, request: Request, response: Response) {
    await sessionService.logout(readRefreshToken(request), {
      ipAddress: request.ip ?? null,
      userAgent: request.get("user-agent") ?? null,
    });
    clearRefreshTokenCookie(response);
    response.status(204).send();
  },

  async list(this: void, request: Request, response: Response) {
    const sessions = await sessionService.list(
      request.auth.user.id,
      request.auth.sessionId,
    );
    response.json(successResponse({ sessions }));
  },

  async revoke(this: void, request: Request, response: Response) {
    const { id } = response.locals.validatedParams as { id: string };
    await sessionService.revoke(request.auth.user.id, id);
    response.status(204).send();
  },
};
