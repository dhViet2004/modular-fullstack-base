import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./google-oauth.service.js", () => ({
  completeGoogleOAuth: vi.fn(),
  recordGoogleOAuthFailure: vi.fn(),
  startGoogleOAuth: vi.fn(),
}));

import { errorMiddleware } from "../../../middleware/error.middleware.js";
import { authRouter } from "../auth.routes.js";
import {
  completeGoogleOAuth,
  recordGoogleOAuthFailure,
  startGoogleOAuth,
} from "./google-oauth.service.js";

const completeMock = vi.mocked(completeGoogleOAuth);
const startMock = vi.mocked(startGoogleOAuth);
const recordFailureMock = vi.mocked(recordGoogleOAuthFailure);

function createTestApp() {
  const app = express();
  app.use("/auth", authRouter);
  app.use(errorMiddleware);
  return app;
}

describe("Google OAuth HTTP flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects the browser to the Google authorization URL", async () => {
    startMock.mockResolvedValue("https://accounts.google.com/authorize");

    const response = await request(createTestApp()).get("/auth/google/start");

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      "https://accounts.google.com/authorize",
    );
  });

  it("sets only the refresh cookie before redirecting to frontend", async () => {
    completeMock.mockResolvedValue({
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        email: "user@example.com",
        displayName: "User",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      session: {
        accessToken: "internal-access-token",
        accessTokenExpiresInSeconds: 900,
        refreshToken: "session-id.refresh-secret",
        refreshTokenExpiresAt: new Date(Date.now() + 60_000),
      },
    });

    const response = await request(createTestApp()).get(
      "/auth/google/callback?code=google-code&state=raw-state",
    );

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      "http://localhost:3000/oauth/google/callback",
    );
    expect(response.headers.location).not.toContain("internal-access-token");
    expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    expect(response.headers["set-cookie"]?.[0]).toContain(
      "refresh_token=session-id.refresh-secret",
    );
  });

  it("redirects provider errors to a stable frontend error code", async () => {
    const response = await request(createTestApp()).get(
      "/auth/google/callback?error=access_denied",
    );

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      "http://localhost:3000/login?error=google_login_failed",
    );
    expect(response.headers.location).not.toContain("access_denied");
    expect(recordFailureMock).toHaveBeenCalledOnce();
  });

  it("rejects a malformed callback before calling the service", async () => {
    const response = await request(createTestApp()).get(
      "/auth/google/callback?code=missing-state",
    );

    expect(response.status).toBe(400);
    expect(completeMock).not.toHaveBeenCalled();
  });

  it("redirects service failures without exposing their details", async () => {
    completeMock.mockRejectedValue(new Error("Google token endpoint detail"));

    const response = await request(createTestApp()).get(
      "/auth/google/callback?code=google-code&state=raw-state",
    );

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      "http://localhost:3000/login?error=google_login_failed",
    );
    expect(response.text).not.toContain("Google token endpoint detail");
  });
});
