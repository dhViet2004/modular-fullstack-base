import type { ErrorRequestHandler } from "express";

export const errorMiddleware: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  void _next;
  console.error("Unhandled request error", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  response.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
    meta: { timestamp: new Date().toISOString() },
  });
};
