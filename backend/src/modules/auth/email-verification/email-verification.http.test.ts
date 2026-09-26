import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../session/session.service.js", () => ({
  authenticateAccessToken: vi.fn(),
  createAuthSession: vi.fn(),
  refreshAuthSession: vi.fn(),
  revokeAuthSession: vi.fn(),
}));

vi.mock("./email-verification.service.js", () => ({
  requestEmailVerification: vi.fn(),
  verifyEmail: vi.fn(),
}));

import { errorMiddleware } from "../../../middleware/error.middleware.js";
import { authRouter } from "../auth.routes.js";
import { authenticateAccessToken } from "../session/session.service.js";
import {
  requestEmailVerification,
  verifyEmail,
} from "./email-verification.service.js";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "user@example.com",
  displayName: "User",
  status: "ACTIVE" as const,
  emailVerifiedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const authenticateMock = vi.mocked(authenticateAccessToken);
const requestVerificationMock = vi.mocked(requestEmailVerification);
const verifyEmailMock = vi.mocked(verifyEmail);

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/auth", authRouter);
  app.use(errorMiddleware);
  return app;
}

describe("email verification HTTP flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects email requests without an access token", async () => {
    const response = await request(createTestApp()).post(
      "/auth/email-verification/request",
    );
    const body = response.body as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("accepts an authenticated email verification request", async () => {
    authenticateMock.mockResolvedValue({
      sessionId: "22222222-2222-4222-8222-222222222222",
      user,
    });
    requestVerificationMock.mockResolvedValue({ accepted: true });

    const response = await request(createTestApp())
      .post("/auth/email-verification/request")
      .set("Authorization", "Bearer access-token")
      .set("User-Agent", "Test Browser");
    const body = response.body as { data: { accepted: boolean } };

    expect(response.status).toBe(202);
    expect(body.data.accepted).toBe(true);
    expect(requestVerificationMock).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({ userAgent: "Test Browser" }),
      "22222222-2222-4222-8222-222222222222",
    );
  });

  it("rejects a verify request without a token", async () => {
    const response = await request(createTestApp())
      .post("/auth/email-verification/verify")
      .send({});
    const body = response.body as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(verifyEmailMock).not.toHaveBeenCalled();
  });

  it("verifies a token without requiring authentication", async () => {
    verifyEmailMock.mockResolvedValue({
      ...user,
      emailVerifiedAt: new Date(),
    });

    const response = await request(createTestApp())
      .post("/auth/email-verification/verify")
      .send({ token: "raw-token" });
    const body = response.body as { data: { user: { id: string } } };

    expect(response.status).toBe(200);
    expect(body.data.user.id).toBe(user.id);
    expect(verifyEmailMock).toHaveBeenCalledWith(
      "raw-token",
      expect.objectContaining({ ipAddress: expect.any(String) as string }),
    );
  });
});
