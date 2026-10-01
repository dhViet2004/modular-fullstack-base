import type { RequestHandler } from "express";

import { ApplicationError } from "../core/http/application-error.js";
import { authenticateAccessToken } from "../modules/session/session.service.js";

// Read the Bearer token, verify the JWT, and attach identity to the request.
export const authenticate: RequestHandler = async (
  request,
  _response,
  next,
) => {
  const authorization = request.headers.authorization;
  const [scheme, token, extraPart] = authorization?.split(" ") ?? [];

  // A valid Bearer header has exactly two parts: `Bearer <access-token>`.
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
