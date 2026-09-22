import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { ApplicationError } from "../core/http/application-error.js";
import { errorMiddleware } from "./error.middleware.js";

function createTestApp(error: unknown) {
  const app = express();

  app.get("/test-error", (_request, _response, next) => {
    next(error);
  });

  app.use(errorMiddleware);

  return app;
}

describe("error middleware", () => {
  it("returns the status, code and message from an application error", async () => {
    const error = new ApplicationError(
      409,
      "USER_EMAIL_ALREADY_EXISTS",
      "A user with this email already exists",
    );

    const response = await request(createTestApp(error)).get("/test-error");

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: "USER_EMAIL_ALREADY_EXISTS",
        message: "A user with this email already exists",
      },
    });
  });
});
