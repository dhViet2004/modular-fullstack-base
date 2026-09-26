import { beforeEach, describe, expect, it, vi } from "vitest";

const transactionClient = vi.hoisted(() => ({
  googleOAuthAttempt: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  googleAccount: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
}));
const createMock = vi.hoisted(() => vi.fn());
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

vi.mock("../../../core/database/prisma.js", () => ({
  prisma: {
    googleOAuthAttempt: { create: createMock },
    $transaction: transactionMock,
  },
}));

import {
  consumeGoogleOAuthAttempt,
  createGoogleOAuthAttempt,
  resolveGoogleUser,
} from "./google-oauth.repository.js";

describe("Google OAuth attempt repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists only the state hash and PKCE verifier", async () => {
    const data = {
      stateHash: "a".repeat(64),
      codeVerifier: "code-verifier",
      expiresAt: new Date("2026-09-26T12:10:00.000Z"),
    };

    await createGoogleOAuthAttempt(data);

    expect(createMock).toHaveBeenCalledWith({
      data,
      select: { id: true },
    });
  });

  it("returns the verifier only when conditional consumption succeeds", async () => {
    const now = new Date("2026-09-26T12:00:00.000Z");
    transactionClient.googleOAuthAttempt.findUnique.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      codeVerifier: "code-verifier",
    });
    transactionClient.googleOAuthAttempt.updateMany.mockResolvedValue({
      count: 1,
    });

    await expect(consumeGoogleOAuthAttempt("a".repeat(64), now)).resolves.toBe(
      "code-verifier",
    );
    expect(
      transactionClient.googleOAuthAttempt.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        id: "11111111-1111-4111-8111-111111111111",
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });
  });

  it("rejects an attempt already consumed by another callback", async () => {
    transactionClient.googleOAuthAttempt.findUnique.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      codeVerifier: "code-verifier",
    });
    transactionClient.googleOAuthAttempt.updateMany.mockResolvedValue({
      count: 0,
    });

    await expect(
      consumeGoogleOAuthAttempt("a".repeat(64), new Date()),
    ).resolves.toBeNull();
  });

  it("returns the user already linked by Google subject", async () => {
    const linkedUser = { id: "user-id", status: "ACTIVE" };
    transactionClient.googleAccount.findUnique.mockResolvedValue({
      user: linkedUser,
    });

    await expect(
      resolveGoogleUser(
        {
          googleSubject: "google-subject",
          email: "user@example.com",
          displayName: "User",
        },
        new Date(),
      ),
    ).resolves.toEqual(linkedUser);
    expect(transactionClient.user.findUnique).not.toHaveBeenCalled();
  });

  it("links a verified Google identity to an existing email user", async () => {
    const verifiedAt = new Date("2026-09-26T12:00:00.000Z");
    transactionClient.googleAccount.findUnique.mockResolvedValue(null);
    transactionClient.user.findUnique.mockResolvedValue({
      id: "user-id",
      emailVerifiedAt: null,
      googleAccount: null,
    });
    transactionClient.user.update.mockResolvedValue({ id: "user-id" });

    await resolveGoogleUser(
      {
        googleSubject: "google-subject",
        email: "user@example.com",
        displayName: "User",
      },
      verifiedAt,
    );

    expect(transactionClient.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-id" },
        data: {
          emailVerifiedAt: verifiedAt,
          googleAccount: { create: { googleSubject: "google-subject" } },
        },
      }),
    );
  });

  it("creates a new verified MEMBER user and Google account atomically", async () => {
    transactionClient.googleAccount.findUnique.mockResolvedValue(null);
    transactionClient.user.findUnique.mockResolvedValue(null);
    transactionClient.user.create.mockResolvedValue({ id: "new-user-id" });

    await resolveGoogleUser(
      {
        googleSubject: "google-subject",
        email: "new@example.com",
        displayName: "New User",
      },
      new Date(),
    );

    const createCall = transactionClient.user.create.mock.calls[0]?.[0] as {
      data: {
        email: string;
        googleAccount: { create: { googleSubject: string } };
        roles: { create: { role: { connect: { code: string } } } };
      };
    };
    expect(createCall.data.email).toBe("new@example.com");
    expect(createCall.data.googleAccount.create.googleSubject).toBe(
      "google-subject",
    );
    expect(createCall.data.roles.create.role.connect.code).toBe("MEMBER");
    expect(transactionMock.mock.calls.at(-1)?.[1]).toEqual({
      isolationLevel: "Serializable",
    });
  });
});
