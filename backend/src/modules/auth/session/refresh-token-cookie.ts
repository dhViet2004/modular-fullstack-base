import type { CookieOptions } from "express";

import { env } from "../../../config/env.js";

export const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";

// Đọc refresh token từ chuỗi Cookie header; trả null nếu cookie không tồn tại hoặc sai encoding.
export function readRefreshTokenCookie(
  cookieHeader: string | undefined,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookiePrefix = `${REFRESH_TOKEN_COOKIE_NAME}=`;

  // `split(";")` tách từng cookie; `map` xóa khoảng trắng; `find` lấy cookie cần tìm.
  const refreshTokenCookie = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(cookiePrefix));

  if (!refreshTokenCookie) {
    return null;
  }

  const encodedToken = refreshTokenCookie.slice(cookiePrefix.length);

  try {
    // `decodeURIComponent` khôi phục giá trị đã được Express encode khi tạo cookie.
    return decodeURIComponent(encodedToken);
  } catch {
    // Cookie có encoding hỏng được xem như không có token hợp lệ.
    return null;
  }
}

// Tạo cấu hình cookie dùng chung khi controller gửi refresh token cho trình duyệt.
export function refreshTokenCookieOptions(expiresAt: Date): CookieOptions {
  return {
    // `httpOnly` ngăn JavaScript phía frontend đọc refresh token.
    httpOnly: true,
    // Production chỉ gửi cookie qua HTTPS; local development vẫn dùng HTTP được.
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/api/v1/auth",
  };
}

// Tạo cấu hình giống cookie gốc để Express xóa đúng refresh token trên trình duyệt.
export function clearRefreshTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
  };
}
