import type { RequestHandler } from "express";
import { successResponse } from "../../../core/http/api-response.js";
import type { RegisterInput } from "./register.schema.js";
import { registerWithPassword } from "./register.service.js";

export const registerController: RequestHandler = async (request, response) => {
  const input = request.body as RegisterInput;
  const user = await registerWithPassword(input);

  response.status(201).json(
    successResponse({
      user,
    }),
  );
};
