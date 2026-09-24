import type { RequestHandler } from "express";
import { successResponse } from "../../../core/http/api-response.js";
import {
  REFRESH_TOKEN_COOKIE_NAME,
  refreshTokenCookieOptions,
} from "../session/refresh-token-cookie.js";
import type { LoginInput } from "./login.schema.js";
import { loginWithPassword } from "./login.service.js";

// Nhận HTTP request đăng nhập, gọi service và chuyển kết quả thành HTTP response.
export const loginController: RequestHandler = async (request, response) => {
  // `as LoginInput` báo cho TypeScript rằng body đã được middleware validate đúng kiểu.
  const input = request.body as LoginInput;
  // `await` chờ Promise từ service hoàn thành trước khi chạy dòng tiếp theo.
  const result = await loginWithPassword(input);

  // `response.cookie` gửi refresh token qua header Set-Cookie thay vì JSON.
  response.cookie(
    REFRESH_TOKEN_COOKIE_NAME,
    result.session.refreshToken,
    refreshTokenCookieOptions(result.session.refreshTokenExpiresAt),
  );

  // JSON chỉ chứa thông tin user và access token; refresh token không lộ cho JavaScript.
  response.json(
    successResponse({
      user: result.user,
      accessToken: result.session.accessToken,
      accessTokenExpiresInSeconds: result.session.accessTokenExpiresInSeconds,
    }),
  );
};
