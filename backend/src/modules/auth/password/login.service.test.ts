import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "../../../core/http/application-error.js";

vi.mock("../../audit/audit.service.js", () => ({
  recordAuditEvent: vi.fn(),
}));

vi.mock("../session/session.service.js", () => ({
  createAuthSession: vi.fn(),
}));

vi.mock("./login.repository.js", () => ({
  findPasswordUserByEmail: vi.fn(),
}));

vi.mock("./password-hasher.js", () => ({
  verifyPassword: vi.fn(),
}));

import { recordAuditEvent } from "../../audit/audit.service.js";
import { createAuthSession } from "../session/session.service.js";
import { findPasswordUserByEmail } from "./login.repository.js";
import { loginWithPassword } from "./login.service.js";
import { verifyPassword } from "./password-hasher.js";

const recordAuditEventMock = vi.mocked(recordAuditEvent);
const createAuthSessionMock = vi.mocked(createAuthSession);
const findPasswordUserByEmailMock = vi.mocked(findPasswordUserByEmail);
const verifyPasswordMock = vi.mocked(verifyPassword);

const context = { ipAddress: "127.0.0.1", userAgent: "Test Browser" };
const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "user@example.com",
  displayName: "User",
  status: "ACTIVE" as const,
  emailVerifiedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  passwordCredential: { passwordHash: "password-hash" },
};

describe("login service audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordAuditEventMock.mockResolvedValue({} as never);
  });

  it("records a failed login without storing an unknown email", async () => {
    findPasswordUserByEmailMock.mockResolvedValue(null);

    await expect(
      loginWithPassword(
        { email: "unknown@example.com", password: "wrong-password" },
        context,
      ),
    ).rejects.toEqual(
      new ApplicationError(
        401,
        "INVALID_CREDENTIALS",
        "Email hoặc mật khẩu không đúng",
      ),
    );

    expect(recordAuditEventMock).toHaveBeenCalledWith({
      action: "AUTH_LOGIN_FAILED",
      outcome: "FAILURE",
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  });

  it("records the known user when password verification fails", async () => {
    findPasswordUserByEmailMock.mockResolvedValue(user);
    verifyPasswordMock.mockResolvedValue(false);

    await expect(
      loginWithPassword(
        { email: user.email, password: "wrong-password" },
        context,
      ),
    ).rejects.toBeInstanceOf(ApplicationError);

    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "AUTH_LOGIN_FAILED",
        actorUserId: user.id,
        subjectId: user.id,
      }),
    );
  });

  it("creates the session and success audit atomically after valid credentials", async () => {
    findPasswordUserByEmailMock.mockResolvedValue(user);
    verifyPasswordMock.mockResolvedValue(true);
    createAuthSessionMock.mockResolvedValue({
      accessToken: "access-token",
      accessTokenExpiresInSeconds: 900,
      refreshToken: "session-id.secret",
      refreshTokenExpiresAt: new Date(),
    });

    await loginWithPassword(
      { email: user.email, password: "correct-password" },
      context,
    );

    expect(createAuthSessionMock).toHaveBeenCalledWith(user.id, context);
    expect(recordAuditEventMock).not.toHaveBeenCalled();
  });
});
