import { beforeEach, describe, expect, it, vi } from "vitest";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("pg-boss", () => ({
  PgBoss: class {
    start = vi.fn().mockResolvedValue(this);
    on = vi.fn();
    send = send;
  },
}));
vi.mock("../auth/email-verification/email-verification.service.js", () => ({
  requestEmailVerification: vi.fn(),
}));

import { ApplicationError } from "../../core/http/application-error.js";
import { requestEmailVerification } from "../auth/email-verification/email-verification.service.js";
import {
  enqueueEmailVerification,
  processEmailVerificationJob,
} from "./email-verification.job.js";

const userId = "11111111-1111-4111-8111-111111111111";

describe("email verification job", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queues only the user id", async () => {
    send.mockResolvedValue("job-id");
    await expect(enqueueEmailVerification(userId)).resolves.toEqual({
      accepted: true,
    });
    expect(send).toHaveBeenCalledWith(
      "email-verification",
      { userId },
      expect.objectContaining({ singletonKey: userId }),
    );
  });

  it("rejects a duplicate request", async () => {
    send.mockResolvedValue(null);
    await expect(enqueueEmailVerification(userId)).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  it("reports queue failure without exposing the database error", async () => {
    send.mockRejectedValue(new Error("database details"));
    await expect(enqueueEmailVerification(userId)).rejects.toEqual(
      new ApplicationError(
        503,
        "EMAIL_DELIVERY_UNAVAILABLE",
        "Dịch vụ gửi email tạm thời không khả dụng",
      ),
    );
  });

  it("creates the token only in the worker and validates job data", async () => {
    await processEmailVerificationJob({ userId });
    expect(requestEmailVerification).toHaveBeenCalledWith(
      userId,
      { ipAddress: null, userAgent: null },
      null,
    );
    await expect(
      processEmailVerificationJob({ userId: "bad" }),
    ).rejects.toThrow("Invalid email verification job");
  });

  it("does not resend after a retry of a delivered job", async () => {
    vi.mocked(requestEmailVerification).mockRejectedValueOnce(
      new ApplicationError(429, "EMAIL_VERIFICATION_RATE_LIMITED", "cooldown"),
    );
    await expect(
      processEmailVerificationJob({ userId }),
    ).resolves.toBeUndefined();
  });
});
