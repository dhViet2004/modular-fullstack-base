import type { Request, Response, CookieOptions } from "express";
import { env } from "../../config/env.js";

const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";

function cookieOptions(expiresAt?: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    ...(expiresAt ? { expires: expiresAt } : {}),
    path: "/api/v1/auth",
  };
}

export function readRefreshToken(request: Request): string {
  const prefix = `${REFRESH_TOKEN_COOKIE_NAME}=`;
  const cookie = request.headers.cookie
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));
  if (!cookie) return "";
  try {
    return decodeURIComponent(cookie.slice(prefix.length));
  } catch {
    return "";
  }
}

export function setRefreshTokenCookie(
  response: Response,
  token: string,
  expiresAt: Date,
): void {
  response.cookie(REFRESH_TOKEN_COOKIE_NAME, token, cookieOptions(expiresAt));
}

export function clearRefreshTokenCookie(response: Response): void {
  response.clearCookie(REFRESH_TOKEN_COOKIE_NAME, cookieOptions());
}
