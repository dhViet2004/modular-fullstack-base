import type { RequestHandler } from "express";
import type { ZodType } from "zod";

import { ApplicationError } from "../core/http/application-error.js";

// Validate query string và chuyển dữ liệu đã parse cho controller qua response.locals.
export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (request, response, next) => {
    const result = schema.safeParse(request.query);

    if (!result.success) {
      next(
        new ApplicationError(
          400,
          "VALIDATION_ERROR",
          "Tham số truy vấn không hợp lệ",
        ),
      );
      return;
    }

    response.locals.validatedQuery = result.data;
    next();
  };
}
