import type { RequestHandler } from "express";
import { successResponse } from "../../../core/http/api-response.js";
import type { LoginInput } from "./login.schema.js";
import { loginWithPassword } from "./login.service.js";

export const loginController: RequestHandler = async (request, response) => {
  const input = request.body as LoginInput;
  const user = await loginWithPassword(input);

  response.json(
    successResponse({
      user,
    }),
  );
};
