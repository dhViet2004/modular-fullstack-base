import type { RequestHandler } from "express";

import { ApplicationError } from "../core/http/application-error.js";
import { authenticateAccessToken } from "../modules/session/session.service.js";

// Äá»c Bearer token, xÃ¡c minh JWT vÃ  gáº¯n identity vÃ o Express request.
export const authenticate: RequestHandler = async (
  request,
  _response,
  next,
) => {
  const authorization = request.headers.authorization;
  const [scheme, token, extraPart] = authorization?.split(" ") ?? [];

  // Bearer header há»£p lá»‡ pháº£i cÃ³ Ä‘Ãºng hai pháº§n: `Bearer <access-token>`.
  if (scheme !== "Bearer" || !token || extraPart) {
    throw new ApplicationError(
      401,
      "UNAUTHENTICATED",
      "Báº¡n cáº§n Ä‘Äƒng nháº­p Ä‘á»ƒ tiáº¿p tá»¥c",
    );
  }

  request.auth = await authenticateAccessToken(token);
  next();
};
