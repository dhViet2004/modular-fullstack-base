import type { RequestHandler } from "express";

import { successResponse } from "../../../core/http/api-response.js";
import {
  readRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE_NAME,
  refreshTokenCookieOptions,
} from "./refresh-token-cookie.js";
import { refreshAuthSession } from "./session.service.js";

// Nhận refresh token từ cookie, xoay vòng session và trả access token mới.
export const refreshController: RequestHandler = async (request, response) => {
  const refreshToken = readRefreshTokenCookie(request.headers.cookie);

  // `??` dùng giá trị bên phải chỉ khi bên trái là null hoặc undefined.
  const result = await refreshAuthSession(refreshToken ?? "");

  // Ghi đè cookie cũ bằng refresh token mới sau khi rotation thành công.
  response.cookie(
    REFRESH_TOKEN_COOKIE_NAME,
    result.refreshToken,
    refreshTokenCookieOptions(result.refreshTokenExpiresAt),
  );

  // Refresh token không được trả trong JSON để JavaScript phía frontend không đọc được.
  response.json(
    successResponse({
      accessToken: result.accessToken,
      accessTokenExpiresInSeconds: result.accessTokenExpiresInSeconds,
    }),
  );
};
