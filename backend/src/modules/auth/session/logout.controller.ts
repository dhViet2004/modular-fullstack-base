import type { RequestHandler } from "express";

import {
  clearRefreshTokenCookieOptions,
  readRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE_NAME,
} from "./refresh-token-cookie.js";
import { revokeAuthSession } from "./session.service.js";

// Thu hồi session nếu cookie hợp lệ và luôn xóa refresh token khỏi trình duyệt.
export const logoutController: RequestHandler = async (request, response) => {
  const refreshToken = readRefreshTokenCookie(request.headers.cookie);

  await revokeAuthSession(refreshToken ?? "", {
    ipAddress: request.ip ?? null,
    userAgent: request.get("user-agent") ?? null,
  });

  // `clearCookie` yêu cầu path/options khớp với lúc tạo cookie.
  response.clearCookie(
    REFRESH_TOKEN_COOKIE_NAME,
    clearRefreshTokenCookieOptions(),
  );
  response.status(204).send();
};
