import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "../../../core/http/application-error.js";

vi.mock("../../mail/email-verification-mail.js", () => ({
  sendEmailVerification: vi.fn(),
}));

vi.mock("../../audit/audit.service.js", () => ({
  normalizeAuditRequestContext: vi.fn(
    (context: { ipAddress: string | null; userAgent: string | null }) =>
      context,
  ),
  recordAuditEvent: vi.fn(),
}));

vi.mock("./email-verification-token.js", () => ({
  generateEmailVerificationToken: vi.fn(),
  hashEmailVerificationToken: vi.fn(),
}));

vi.mock("./email-verification.repository.js", () => ({
  consumeEmailVerificationToken: vi.fn(),
  createEmailVerificationToken: vi.fn(),
  deleteEmailVerificationToken: vi.fn(),
}));

import { sendEmailVerification } from "../../mail/email-verification-mail.js";
import { recordAuditEvent } from "../../audit/audit.service.js";
import {
  consumeEmailVerificationToken,
  createEmailVerificationToken,
  deleteEmailVerificationToken,
} from "./email-verification.repository.js";
import {
  requestEmailVerification,
  verifyEmail,
} from "./email-verification.service.js";
import {
  generateEmailVerificationToken,
  hashEmailVerificationToken,
} from "./email-verification-token.js";

const userId = "11111111-1111-4111-8111-111111111111";
const now = new Date("2026-09-26T12:00:00.000Z");
const context = { ipAddress: "127.0.0.1", userAgent: "Test Browser" };
const sessionId = "33333333-3333-4333-8333-333333333333";
const createTokenMock = vi.mocked(createEmailVerificationToken);
const consumeTokenMock = vi.mocked(consumeEmailVerificationToken);
const deleteTokenMock = vi.mocked(deleteEmailVerificationToken);
const generateTokenMock = vi.mocked(generateEmailVerificationToken);
const hashTokenMock = vi.mocked(hashEmailVerificationToken);
const sendMailMock = vi.mocked(sendEmailVerification);
const recordAuditEventMock = vi.mocked(recordAuditEvent);

describe("email verification service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateTokenMock.mockReturnValue({
      token: "raw-email-verification-token",
      tokenHash: "a".repeat(64),
    });
  });

  it("creates a hashed token and sends the configured frontend URL", async () => {
    createTokenMock.mockResolvedValue({
      status: "created",
      tokenId: "22222222-2222-4222-8222-222222222222",
      email: "user@example.com",
    });

    await expect(
      requestEmailVerification(userId, context, sessionId, now),
    ).resolves.toEqual({ accepted: true });

    expect(createTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId, tokenHash: "a".repeat(64) }),
    );
    expect(sendMailMock).toHaveBeenCalledWith({
      to: "user@example.com",
      verificationUrl:
        "http://localhost:3000/verify-email?token=raw-email-verification-token",
    });
    expect(sendMailMock.mock.calls[0]?.[0]).not.toHaveProperty("tokenHash");
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "EMAIL_VERIFICATION_REQUESTED",
        actorUserId: userId,
        sessionId,
      }),
    );
  });

  it("does not send another email when the user is already verified", async () => {
    createTokenMock.mockResolvedValue({ status: "already-verified" });

    await expect(
      requestEmailVerification(userId, context, sessionId, now),
    ).resolves.toEqual({ accepted: true });
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it("rejects a request made inside the cooldown", async () => {
    createTokenMock.mockResolvedValue({ status: "rate-limited" });

    await expect(
      requestEmailVerification(userId, context, sessionId, now),
    ).rejects.toEqual(
      new ApplicationError(
        429,
        "EMAIL_VERIFICATION_RATE_LIMITED",
        "Vui lòng chờ trước khi yêu cầu gửi lại email xác minh",
      ),
    );
  });

  it("deletes the new token when mail delivery fails", async () => {
    const deliveryError = new Error("mail unavailable");
    createTokenMock.mockResolvedValue({
      status: "created",
      tokenId: "22222222-2222-4222-8222-222222222222",
      email: "user@example.com",
    });
    sendMailMock.mockRejectedValue(deliveryError);

    await expect(
      requestEmailVerification(userId, context, sessionId, now),
    ).rejects.toEqual(
      new ApplicationError(
        503,
        "EMAIL_DELIVERY_UNAVAILABLE",
        "Dịch vụ gửi email tạm thời không khả dụng",
      ),
    );
    expect(deleteTokenMock).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
    );
  });

  it("hashes and consumes a valid token", async () => {
    const verifiedUser = {
      id: userId,
      email: "user@example.com",
      displayName: "User",
      status: "ACTIVE" as const,
      emailVerifiedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    hashTokenMock.mockReturnValue("b".repeat(64));
    consumeTokenMock.mockResolvedValue(verifiedUser);

    await expect(verifyEmail("raw-token", context, now)).resolves.toEqual(
      verifiedUser,
    );
    expect(consumeTokenMock).toHaveBeenCalledWith(
      "b".repeat(64),
      now,
      expect.objectContaining({
        action: "EMAIL_VERIFICATION_SUCCEEDED",
        subjectType: "USER",
      }),
    );
  });

  it("returns the same error for every invalid token state", async () => {
    hashTokenMock.mockReturnValue("b".repeat(64));
    consumeTokenMock.mockResolvedValue(null);

    await expect(verifyEmail("invalid-token", context, now)).rejects.toEqual(
      new ApplicationError(
        400,
        "INVALID_EMAIL_VERIFICATION_TOKEN",
        "Liên kết xác minh email không hợp lệ hoặc đã hết hạn",
      ),
    );
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "EMAIL_VERIFICATION_FAILED",
        outcome: "FAILURE",
      }),
    );
  });
});
