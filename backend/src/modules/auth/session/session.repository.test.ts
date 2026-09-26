import { beforeEach, describe, expect, it, vi } from "vitest";

const transactionClient = vi.hoisted(() => ({
  session: {
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
}));

const transactionMock = vi.hoisted(() =>
  vi.fn((callback: (transaction: typeof transactionClient) => unknown) =>
    Promise.resolve(callback(transactionClient)),
  ),
);

vi.mock("../../../core/database/prisma.js", () => ({
  prisma: {
    $transaction: transactionMock,
  },
}));

import {
  createSessionWithAudit,
  revokeSessionWithAudit,
} from "./session.repository.js";

const sessionData = {
  id: "22222222-2222-4222-8222-222222222222",
  userId: "11111111-1111-4111-8111-111111111111",
  refreshTokenHash: "a".repeat(64),
  expiresAt: new Date(),
};

const auditData = {
  action: "AUTH_LOGIN_SUCCEEDED" as const,
  outcome: "SUCCESS" as const,
  actorUserId: sessionData.userId,
  subjectType: "SESSION" as const,
  subjectId: sessionData.id,
  sessionId: sessionData.id,
  ipAddress: "127.0.0.1",
  userAgent: "Test Browser",
};

describe("session repository audit transaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the session and login audit with the same transaction client", async () => {
    transactionClient.session.create.mockResolvedValue(sessionData);
    transactionClient.auditLog.create.mockResolvedValue({ id: "audit-id" });

    await createSessionWithAudit(sessionData, auditData);

    expect(transactionClient.session.create).toHaveBeenCalledWith({
      data: sessionData,
    });
    expect(transactionClient.auditLog.create).toHaveBeenCalledWith({
      data: auditData,
    });
  });

  it("rejects the transaction when the login audit cannot be written", async () => {
    transactionClient.session.create.mockResolvedValue(sessionData);
    transactionClient.auditLog.create.mockRejectedValue(
      new Error("audit write failed"),
    );

    await expect(
      createSessionWithAudit(sessionData, auditData),
    ).rejects.toThrow("audit write failed");
  });

  it("does not write logout audit when no session was revoked", async () => {
    transactionClient.session.updateMany.mockResolvedValue({ count: 0 });

    await revokeSessionWithAudit(
      {
        sessionId: sessionData.id,
        refreshTokenHash: sessionData.refreshTokenHash,
        revokedAt: new Date(),
      },
      { ...auditData, action: "AUTH_LOGOUT_SUCCEEDED" },
    );

    expect(transactionClient.auditLog.create).not.toHaveBeenCalled();
  });
});
