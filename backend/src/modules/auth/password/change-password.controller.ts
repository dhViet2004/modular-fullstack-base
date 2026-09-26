import type { RequestHandler } from "express";
import { ApplicationError } from "../../../core/http/application-error.js";
import { successResponse } from "../../../core/http/api-response.js";
import { hashPassword, verifyPassword } from "./password-hasher.js";
import {
  findPasswordHash,
  updatePasswordHash,
} from "./change-password.repository.js";
import type { ChangePasswordInput } from "./change-password.schema.js";

export const changePasswordController: RequestHandler = async (
  request,
  response,
) => {
  const input = request.body as ChangePasswordInput;
  const credential = await findPasswordHash(request.auth.user.id);
  if (
    !credential ||
    !(await verifyPassword(credential.passwordHash, input.currentPassword))
  ) {
    throw new ApplicationError(
      400,
      "INVALID_CURRENT_PASSWORD",
      "Mật khẩu hiện tại không đúng",
    );
  }
  await updatePasswordHash(
    request.auth.user.id,
    await hashPassword(input.newPassword),
  );
  response.json(successResponse({ changed: true }));
};
