import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./session.service.js", () => ({
  authenticateAccessToken: vi.fn(),
  refreshAuthSession: vi.fn(),
  revokeAuthSession: vi.fn(),
}));

vi.mock("../../access/access.service.js", () => ({
  getUserAccessContext: vi.fn(),
}));

import { errorMiddleware } from "../../../middleware/error.middleware.js";
import { authenticate } from "../../../middleware/authenticate.middleware.js";
import { getUserAccessContext } from "../../access/access.service.js";
import { logoutController } from "./logout.controller.js";
import { meController } from "./me.controller.js";
import { refreshController } from "./refresh.controller.js";
import {
  authenticateAccessToken,
  refreshAuthSession,
  revokeAuthSession,
} from "./session.service.js";

const authenticateAccessTokenMock = vi.mocked(authenticateAccessToken);
const refreshAuthSessionMock = vi.mocked(refreshAuthSession);
const revokeAuthSessionMock = vi.mocked(revokeAuthSession);
const getUserAccessContextMock = vi.mocked(getUserAccessContext);

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "user@example.com",
  displayName: "User",
  status: "ACTIVE" as const,
  emailVerifiedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Tạo Express app nhỏ để kiểm tra HTTP contract mà không khởi động server thật.
function createTestApp() {
  const app = express();
  app.post("/refresh", refreshController);
  app.post("/logout", logoutController);
  app.get("/me", authenticate, meController);
  app.use(errorMiddleware);
  return app;
}

describe("session HTTP flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserAccessContextMock.mockResolvedValue({
      roles: ["MEMBER"],
      permissions: ["profile:read:self", "profile:update:self"],
    });
  });

  it("rotates the HttpOnly cookie without exposing refresh token in JSON", async () => {
    refreshAuthSessionMock.mockResolvedValue({
      accessToken: "new-access-token",
      accessTokenExpiresInSeconds: 900,
      refreshToken: "session-id.new-secret",
      refreshTokenExpiresAt: new Date(Date.now() + 60_000),
    });

    const response = await request(createTestApp())
      .post("/refresh")
      .set("Cookie", "refresh_token=session-id.old-secret");
    const body = response.body as {
      data: {
        accessToken: string;
        accessTokenExpiresInSeconds: number;
      };
    };

    expect(response.status).toBe(200);
    expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    expect(body.data).toEqual({
      accessToken: "new-access-token",
      accessTokenExpiresInSeconds: 900,
    });
    expect(JSON.stringify(response.body)).not.toContain("new-secret");
  });

  it("revokes the session and clears the cookie during logout", async () => {
    const response = await request(createTestApp())
      .post("/logout")
      .set("Cookie", "refresh_token=session-id.secret");

    expect(response.status).toBe(204);
    expect(revokeAuthSessionMock).toHaveBeenCalledWith(
      "session-id.secret",
      expect.objectContaining({
        ipAddress: expect.any(String) as string,
        userAgent: null,
      }),
    );
    expect(response.headers["set-cookie"]?.[0]).toContain("refresh_token=");
  });

  it("returns the authenticated user for a valid Bearer token", async () => {
    authenticateAccessTokenMock.mockResolvedValue({
      sessionId: "22222222-2222-4222-8222-222222222222",
      user,
    });

    const response = await request(createTestApp())
      .get("/me")
      .set("Authorization", "Bearer access-token");
    const body = response.body as {
      data: {
        user: { email: string };
        access: { roles: string[]; permissions: string[] };
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.user.email).toBe(user.email);
    expect(body.data.access.roles).toEqual(["MEMBER"]);
  });

  it("rejects a protected route without a Bearer token", async () => {
    const response = await request(createTestApp()).get("/me");
    const body = response.body as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });
});
