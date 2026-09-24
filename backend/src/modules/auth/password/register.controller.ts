import type { RequestHandler } from "express";
import { successResponse } from "../../../core/http/api-response.js";
import type { RegisterInput } from "./register.schema.js";
import { registerWithPassword } from "./register.service.js";

// Nhận HTTP request đăng ký, gọi service và trả user mới với status 201 Created.
export const registerController: RequestHandler = async (request, response) => {
  // `as RegisterInput` xác nhận body đã được middleware validate theo schema đăng ký.
  const input = request.body as RegisterInput;
  const user = await registerWithPassword(input);

  // `status(201)` đặt HTTP status trước khi `json` gửi response body.
  response.status(201).json(
    successResponse({
      user,
    }),
  );
};
