import type { RequestHandler } from "express";

import { successResponse } from "../../../core/http/api-response.js";

// Trả thông tin user đã được authenticate middleware xác minh.
export const meController: RequestHandler = (request, response) => {
  response.json(
    successResponse({
      user: request.auth.user,
    }),
  );
};
