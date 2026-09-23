import type { ErrorRequestHandler } from "express";
import { ApplicationError } from "../core/http/application-error.js";

export const errorMiddleware: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  void _next;

  if (error instanceof ApplicationError) {
    response.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      meta: { timestamp: new Date().toISOString() },
    });

    return;
  }

  console.error("Unhandled request error", {
    name: error instanceof Error ? error.name : "UnknownError",
  });

  response.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Đã xảy ra lỗi không mong muốn",
    },
    meta: { timestamp: new Date().toISOString() },
  });
};
