import type { RequestHandler } from "express";
import type { ZodType } from "zod";

import { ApplicationError } from "../core/http/application-error.js";

export function validateParams<T>(schema: ZodType<T>): RequestHandler {
  return (request, response, next) => {
    const result = schema.safeParse(request.params);
    if (!result.success) {
      next(
        new ApplicationError(
          400,
          "VALIDATION_ERROR",
          "Tham số đường dẫn không hợp lệ",
        ),
      );
      return;
    }
    response.locals.validatedParams = result.data;
    next();
  };
}
