import type { RequestHandler } from "express";
import { z } from "zod";
import { ApplicationError } from "../../../core/http/application-error.js";
import { successResponse } from "../../../core/http/api-response.js";
import { getActiveSessions, revokeUserSession } from "./session.service.js";

export const listSessionsController: RequestHandler = async (request, response) => {
  const sessions = await getActiveSessions(request.auth.user.id, request.auth.sessionId);
  response.json(successResponse({ sessions }));
};

export const revokeSessionController: RequestHandler = async (request, response) => {
  const id = z.uuid().safeParse(request.params.id);
  if (!id.success) throw new ApplicationError(400, "VALIDATION_ERROR", "Session ID không hợp lệ");
  await revokeUserSession(request.auth.user.id, id.data);
  response.status(204).send();
};
