import type { RequestHandler } from "express";
import { successResponse } from "../../core/http/api-response.js";
import { authService } from "./auth.service.js";
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
} from "./auth.schema.js";
import { setRefreshTokenCookie } from "../../core/http/refresh-token-cookie.js";

export const authController = {
  register: (async (request, response) => {
    const user = await authService.register(request.body as RegisterInput);
    response.status(201).json(successResponse({ user }));
  }) as RequestHandler,

  login: (async (request, response) => {
    const result = await authService.login(request.body as LoginInput, {
      ipAddress: request.ip ?? null,
      userAgent: request.get("user-agent") ?? null,
    });
    if (result.session.refreshToken) {
      setRefreshTokenCookie(
        response,
        result.session.refreshToken,
        result.session.refreshTokenExpiresAt,
      );
    }
    response.json(
      successResponse({
        user: result.user,
        accessToken: result.session.accessToken,
        accessTokenExpiresInSeconds: result.session.accessTokenExpiresInSeconds,
      }),
    );
  }) as RequestHandler,

  changePassword: (async (request, response) => {
    await authService.changePassword(
      request.auth.user.id,
      request.body as ChangePasswordInput,
    );
    response.status(204).send();
  }) as RequestHandler,
};
