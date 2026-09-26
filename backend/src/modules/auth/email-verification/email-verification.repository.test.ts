import { beforeEach, describe, expect, it, vi } from "vitest";

const transactionClient = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  emailVerificationToken: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
}));

const transactionMock = vi.hoisted(() =>
  vi.fn(
    (
      callback: (transaction: typeof transactionClient) => unknown,
      options?: { isolationLevel?: string },
    ) => {
      void options;
      return Promise.resolve(callback(transactionClient));
    },
  ),
);
const deleteManyMock = vi.hoisted(() => vi.fn());

vi.mock("../../../core/database/prisma.js", () => ({
  prisma: {
    $transaction: transactionMock,
    emailVerificationToken: { deleteMany: deleteManyMock },
  },
}));

import {
  consumeEmailVerificationToken,
  createEmailVerificationToken,
  deleteEmailVerificationToken,
} from "./email-verification.repository.js";

const userId = "11111111-1111-4111-8111-111111111111";
const now = new Date("2026-09-26T12:00:00.000Z");
const audit = {
  action: "EMAIL_VERIFICATION_SUCCEEDED" as const,
  outcome: "SUCCESS" as const,
  subjectType: "USER" as const,
  sessionId: null,
  ipAddress: "127.0.0.1",
  userAgent: "Test Browser",
};

describe("email verification repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("replaces an unused token inside a serializable transaction", async () => {
    transactionClient.user.findUnique.mockResolvedValue({
      email: "user@example.com",
      emailVerifiedAt: null,
    });
    transactionClient.emailVerificationToken.findFirst.mockResolvedValue(null);
    transactionClient.emailVerificationToken.create.mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
    });

    await expect(
      createEmailVerificationToken({
        userId,
        tokenHash: "a".repeat(64),
        expiresAt: new Date(now.getTime() + 60_000),
        cooldownStartedAt: new Date(now.getTime() - 60_000),
      }),
    ).resolves.toEqual({
      status: "created",
      tokenId: "22222222-2222-4222-8222-222222222222",
      email: "user@example.com",
    });

    expect(
      transactionClient.emailVerificationToken.deleteMany,
    ).toHaveBeenCalledWith({ where: { userId, consumedAt: null } });
    expect(transactionMock.mock.calls[0]?.[1]).toEqual({
      isolationLevel: "Serializable",
    });
  });

  it("updates the user only when conditional token consumption succeeds", async () => {
    transactionClient.emailVerificationToken.findUnique.mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
      userId,
    });
    transactionClient.emailVerificationToken.updateMany.mockResolvedValue({
      count: 0,
    });

    await expect(
      consumeEmailVerificationToken("a".repeat(64), now, audit),
    ).resolves.toBeNull();
    expect(transactionClient.user.update).not.toHaveBeenCalled();
  });

  it("marks the token consumed and user verified in the same transaction", async () => {
    transactionClient.emailVerificationToken.findUnique.mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
      userId,
    });
    transactionClient.emailVerificationToken.updateMany.mockResolvedValue({
      count: 1,
    });
    transactionClient.user.update.mockResolvedValue({ id: userId });

    await consumeEmailVerificationToken("a".repeat(64), now, audit);

    expect(
      transactionClient.emailVerificationToken.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        id: "22222222-2222-4222-8222-222222222222",
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });
    expect(transactionClient.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { emailVerifiedAt: now } }),
    );
    expect(transactionClient.auditLog.create).toHaveBeenCalledWith({
      data: {
        ...audit,
        actorUserId: userId,
        subjectId: userId,
      },
    });
  });

  it("deletes only the token selected for delivery compensation", async () => {
    await deleteEmailVerificationToken("22222222-2222-4222-8222-222222222222");

    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { id: "22222222-2222-4222-8222-222222222222" },
    });
  });
});
