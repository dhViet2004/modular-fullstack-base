import type { RequestHandler } from "express";

import { successResponse } from "../../../core/http/api-response.js";
import { getUserAccessContext } from "../../access/access.service.js";

// Trả thông tin user đã được authenticate middleware xác minh.
export const meController: RequestHandler = async (request, response) => {
  const access = await getUserAccessContext(request.auth.user.id);

  response.json(
    successResponse({
      user: request.auth.user,
      access,
    }),
  );
};
