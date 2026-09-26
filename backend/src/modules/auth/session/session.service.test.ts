import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "../../../core/http/application-error.js";

vi.mock("./access-token.js", () => ({
  signAccessToken: vi.fn(),
  verifyAccessToken: vi.fn(),
}));

vi.mock("./refresh-token.js", () => ({
  generateRefreshToken: vi.fn(),
  parseRefreshToken: vi.fn(),
  verifyRefreshTokenSecret: vi.fn(),
}));

vi.mock("./session.repository.js", () => ({
  createSessionWithAudit: vi.fn(),
  findSessionById: vi.fn(),
  revokeSessionWithAudit: vi.fn(),
  rotateSessionRefreshToken: vi.fn(),
}));

import { signAccessToken, verifyAccessToken } from "./access-token.js";
import {
  generateRefreshToken,
  parseRefreshToken,
  verifyRefreshTokenSecret,
} from "./refresh-token.js";
import {
  createSessionWithAudit,
  findSessionById,
  revokeSessionWithAudit,
  rotateSessionRefreshToken,
} from "./session.repository.js";
import {
  authenticateAccessToken,
  createAuthSession,
  refreshAuthSession,
  revokeAuthSession,
} from "./session.service.js";

const signAccessTokenMock = vi.mocked(signAccessToken);
const verifyAccessTokenMock = vi.mocked(verifyAccessToken);
const generateRefreshTokenMock = vi.mocked(generateRefreshToken);
const parseRefreshTokenMock = vi.mocked(parseRefreshToken);
const verifyRefreshTokenSecretMock = vi.mocked(verifyRefreshTokenSecret);
const createSessionWithAuditMock = vi.mocked(createSessionWithAudit);
const findSessionByIdMock = vi.mocked(findSessionById);
const revokeSessionWithAuditMock = vi.mocked(revokeSessionWithAudit);
const rotateSessionRefreshTokenMock = vi.mocked(rotateSessionRefreshToken);

const activeSession = {
  id: "22222222-2222-4222-8222-222222222222",
  userId: "11111111-1111-4111-8111-111111111111",
  refreshTokenHash: "a".repeat(64),
  expiresAt: new Date(Date.now() + 60_000),
  revokedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: {
    id: "11111111-1111-4111-8111-111111111111",
    email: "user@example.com",
    displayName: "User",
    status: "ACTIVE" as const,
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

describe("session service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signAccessTokenMock.mockResolvedValue("signed-access-token");
    generateRefreshTokenMock.mockReturnValue({
      token: `${activeSession.id}.new-secret`,
      tokenHash: "b".repeat(64),
    });
  });

  it("creates a database session without storing the raw refresh token", async () => {
    await createAuthSession(activeSession.userId, {
      ipAddress: "127.0.0.1",
      userAgent: "Test Browser",
    });

    expect(createSessionWithAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: activeSession.userId,
        refreshTokenHash: "b".repeat(64),
      }),
      expect.objectContaining({
        action: "AUTH_LOGIN_SUCCEEDED",
        actorUserId: activeSession.userId,
        ipAddress: "127.0.0.1",
      }),
    );
    expect(createSessionWithAuditMock.mock.calls[0]?.[0]).not.toHaveProperty(
      "refreshToken",
    );
  });

  it("rotates a valid refresh token with a conditional database update", async () => {
    parseRefreshTokenMock.mockReturnValue({
      sessionId: activeSession.id,
      secret: "old-secret",
    });
    findSessionByIdMock.mockResolvedValue(activeSession);
    verifyRefreshTokenSecretMock.mockReturnValue(true);
    rotateSessionRefreshTokenMock.mockResolvedValue({ count: 1 });

    const result = await refreshAuthSession("old-refresh-token");

    expect(result.refreshToken).toBe(`${activeSession.id}.new-secret`);
    expect(rotateSessionRefreshTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: activeSession.id,
        currentRefreshTokenHash: activeSession.refreshTokenHash,
        newRefreshTokenHash: "b".repeat(64),
      }),
    );
  });

  it("rejects a refresh token when another request already rotated it", async () => {
    parseRefreshTokenMock.mockReturnValue({
      sessionId: activeSession.id,
      secret: "old-secret",
    });
    findSessionByIdMock.mockResolvedValue(activeSession);
    verifyRefreshTokenSecretMock.mockReturnValue(true);
    rotateSessionRefreshTokenMock.mockResolvedValue({ count: 0 });

    await expect(refreshAuthSession("old-refresh-token")).rejects.toEqual(
      new ApplicationError(
        401,
        "INVALID_REFRESH_TOKEN",
        "Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
      ),
    );
  });

  it("does not revoke a session when the refresh secret is invalid", async () => {
    parseRefreshTokenMock.mockReturnValue({
      sessionId: activeSession.id,
      secret: "wrong-secret",
    });
    findSessionByIdMock.mockResolvedValue(activeSession);
    verifyRefreshTokenSecretMock.mockReturnValue(false);

    await revokeAuthSession("invalid-refresh-token", {
      ipAddress: null,
      userAgent: null,
    });

    expect(revokeSessionWithAuditMock).not.toHaveBeenCalled();
  });

  it("revokes a valid session with its logout audit event", async () => {
    parseRefreshTokenMock.mockReturnValue({
      sessionId: activeSession.id,
      secret: "valid-secret",
    });
    findSessionByIdMock.mockResolvedValue(activeSession);
    verifyRefreshTokenSecretMock.mockReturnValue(true);

    await revokeAuthSession("valid-refresh-token", {
      ipAddress: "127.0.0.1",
      userAgent: "Test Browser",
    });

    expect(revokeSessionWithAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: activeSession.id }),
      expect.objectContaining({
        action: "AUTH_LOGOUT_SUCCEEDED",
        actorUserId: activeSession.userId,
        sessionId: activeSession.id,
      }),
    );
  });

  it("authenticates an access token only when its user and session match", async () => {
    verifyAccessTokenMock.mockResolvedValue({
      userId: activeSession.userId,
      sessionId: activeSession.id,
    });
    findSessionByIdMock.mockResolvedValue(activeSession);

    await expect(authenticateAccessToken("access-token")).resolves.toEqual({
      sessionId: activeSession.id,
      user: activeSession.user,
    });
  });

  it("maps JWT verification failures to a generic authentication error", async () => {
    verifyAccessTokenMock.mockRejectedValue(new Error("invalid signature"));

    await expect(authenticateAccessToken("bad-token")).rejects.toEqual(
      new ApplicationError(
        401,
        "UNAUTHENTICATED",
        "Bạn cần đăng nhập để tiếp tục",
      ),
    );
  });
});
