import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "../../../core/http/application-error.js";

vi.mock("./google-oauth-client.js", () => ({
  createGoogleAuthorizationUrl: vi.fn(),
  exchangeGoogleAuthorizationCode: vi.fn(),
  verifyGoogleIdToken: vi.fn(),
}));

vi.mock("./google-oauth-state.js", () => ({
  generateGoogleOAuthAttempt: vi.fn(),
  hashGoogleOAuthState: vi.fn(),
}));

vi.mock("./google-oauth.repository.js", () => ({
  consumeGoogleOAuthAttempt: vi.fn(),
  createGoogleOAuthAttempt: vi.fn(),
  resolveGoogleUser: vi.fn(),
}));

vi.mock("../session/session.service.js", () => ({
  createAuthSession: vi.fn(),
}));

vi.mock("../../audit/audit.service.js", () => ({
  recordAuditEvent: vi.fn(),
}));

import { createAuthSession } from "../session/session.service.js";
import { recordAuditEvent } from "../../audit/audit.service.js";
import {
  createGoogleAuthorizationUrl,
  exchangeGoogleAuthorizationCode,
  verifyGoogleIdToken,
} from "./google-oauth-client.js";
import {
  consumeGoogleOAuthAttempt,
  createGoogleOAuthAttempt,
  resolveGoogleUser,
} from "./google-oauth.repository.js";
import {
  completeGoogleOAuth,
  startGoogleOAuth,
} from "./google-oauth.service.js";
import {
  generateGoogleOAuthAttempt,
  hashGoogleOAuthState,
} from "./google-oauth-state.js";

const context = { ipAddress: "127.0.0.1", userAgent: "Test Browser" };
const now = new Date("2026-09-26T12:00:00.000Z");
const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "user@example.com",
  displayName: "User",
  status: "ACTIVE" as const,
  emailVerifiedAt: now,
  createdAt: now,
  updatedAt: now,
};
const createAttemptMock = vi.mocked(createGoogleOAuthAttempt);
const recordAuditEventMock = vi.mocked(recordAuditEvent);

describe("Google OAuth service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores only state hash and returns the Google authorization URL", async () => {
    vi.mocked(generateGoogleOAuthAttempt).mockReturnValue({
      state: "raw-state",
      stateHash: "a".repeat(64),
      codeVerifier: "code-verifier",
      codeChallenge: "code-challenge",
    });
    vi.mocked(createGoogleAuthorizationUrl).mockReturnValue(
      "https://accounts.google.com/authorize",
    );

    await expect(startGoogleOAuth(now)).resolves.toBe(
      "https://accounts.google.com/authorize",
    );
    expect(createAttemptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stateHash: "a".repeat(64),
        codeVerifier: "code-verifier",
      }),
    );
    expect(createAttemptMock.mock.calls[0]?.[0]).not.toHaveProperty("state");
  });

  it("rejects an invalid or reused state before exchanging the code", async () => {
    vi.mocked(hashGoogleOAuthState).mockReturnValue("a".repeat(64));
    vi.mocked(consumeGoogleOAuthAttempt).mockResolvedValue(null);

    await expect(
      completeGoogleOAuth("code", "state", context, now),
    ).rejects.toEqual(
      new ApplicationError(
        401,
        "GOOGLE_LOGIN_FAILED",
        "Không thể đăng nhập bằng Google",
      ),
    );
    expect(exchangeGoogleAuthorizationCode).not.toHaveBeenCalled();
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "AUTH_GOOGLE_LOGIN_FAILED" }),
    );
  });

  it("resolves the Google user and creates the existing JWT session", async () => {
    vi.mocked(hashGoogleOAuthState).mockReturnValue("a".repeat(64));
    vi.mocked(consumeGoogleOAuthAttempt).mockResolvedValue("code-verifier");
    vi.mocked(exchangeGoogleAuthorizationCode).mockResolvedValue("id-token");
    vi.mocked(verifyGoogleIdToken).mockResolvedValue({
      googleSubject: "google-subject",
      email: user.email,
      displayName: user.displayName,
    });
    vi.mocked(resolveGoogleUser).mockResolvedValue(user);
    vi.mocked(createAuthSession).mockResolvedValue({
      accessToken: "access-token",
      accessTokenExpiresInSeconds: 900,
      refreshToken: "refresh-token",
      refreshTokenExpiresAt: new Date(now.getTime() + 60_000),
    });

    const result = await completeGoogleOAuth("code", "state", context, now);

    expect(resolveGoogleUser).toHaveBeenCalledWith(
      expect.objectContaining({ googleSubject: "google-subject" }),
      now,
    );
    expect(createAuthSession).toHaveBeenCalledWith(
      user.id,
      context,
      "AUTH_GOOGLE_LOGIN_SUCCEEDED",
    );
    expect(result.user).toEqual(user);
  });

  it("does not create a session for a suspended linked user", async () => {
    vi.mocked(hashGoogleOAuthState).mockReturnValue("a".repeat(64));
    vi.mocked(consumeGoogleOAuthAttempt).mockResolvedValue("code-verifier");
    vi.mocked(exchangeGoogleAuthorizationCode).mockResolvedValue("id-token");
    vi.mocked(verifyGoogleIdToken).mockResolvedValue({
      googleSubject: "google-subject",
      email: user.email,
      displayName: user.displayName,
    });
    vi.mocked(resolveGoogleUser).mockResolvedValue({
      ...user,
      status: "SUSPENDED",
    });

    await expect(
      completeGoogleOAuth("code", "state", context, now),
    ).rejects.toMatchObject({ statusCode: 403, code: "ACCOUNT_SUSPENDED" });
    expect(createAuthSession).not.toHaveBeenCalled();
  });
});
