import type { RequestHandler } from "express";

import { ApplicationError } from "../core/http/application-error.js";
import { authenticateAccessToken } from "../modules/auth/session/session.service.js";

// Đọc Bearer token, xác minh session và gắn identity vào Express request.
export const authenticate: RequestHandler = async (
  request,
  _response,
  next,
) => {
  const authorization = request.headers.authorization;
  const [scheme, token, extraPart] = authorization?.split(" ") ?? [];

  // Bearer header hợp lệ phải có đúng hai phần: `Bearer <access-token>`.
  if (scheme !== "Bearer" || !token || extraPart) {
    throw new ApplicationError(
      401,
      "UNAUTHENTICATED",
      "Bạn cần đăng nhập để tiếp tục",
    );
  }

  request.auth = await authenticateAccessToken(token);
  next();
};
