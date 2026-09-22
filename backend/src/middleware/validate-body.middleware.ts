import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { ApplicationError } from "../core/http/application-error.js";

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      next(
        new ApplicationError(
          400,
          "VALIDATION_ERROR",
          "Request body is invalid",
        ),
      );

      return;
    }

    request.body = result.data;
    next();
  };
}
