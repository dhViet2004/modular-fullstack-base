import type { RequestHandler } from "express";
import { authService } from "./auth.service.js";
import type { ChangePasswordInput } from "./auth.schema.js";

export const authController = {
  changePassword: (async (request, response) => {
    await authService.changePassword(
      request.auth.user.id,
      request.body as ChangePasswordInput,
    );
    response.status(204).send();
  }) as RequestHandler,
};
