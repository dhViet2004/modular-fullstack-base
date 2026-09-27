import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("../../../core/database/prisma.js", () => ({
  prisma: {
    user: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    role: { findUniqueOrThrow: vi.fn() },
    userRole: { upsert: vi.fn(), deleteMany: vi.fn() },
  },
}));

import { prisma } from "../../../core/database/prisma.js";
import { createUser, setAdminRole } from "../user.service.js";

// Prisma methods are mocks; direct references are intentional test seams.
// eslint-disable-next-line @typescript-eslint/unbound-method
const createUserMock = vi.mocked(prisma.user.create);
// eslint-disable-next-line @typescript-eslint/unbound-method
const findUserMock = vi.mocked(prisma.user.findUnique);
// eslint-disable-next-line @typescript-eslint/unbound-method
const roleMock = vi.mocked(prisma.role.findUniqueOrThrow);
// eslint-disable-next-line @typescript-eslint/unbound-method
const upsertMock = vi.mocked(prisma.userRole.upsert);
// eslint-disable-next-line @typescript-eslint/unbound-method
const deleteManyMock = vi.mocked(prisma.userRole.deleteMany);

describe("user service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalizes identity fields before creating a user", async () => {
    await createUser({ email: " User@Example.COM ", displayName: " User " });
    expect(createUserMock).toHaveBeenCalledWith({
      data: { email: "user@example.com", displayName: "User" },
    });
  });

  it("maps duplicate email to the public conflict error", async () => {
    createUserMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    await expect(
      createUser({ email: "user@example.com" }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "USER_EMAIL_ALREADY_EXISTS",
    });
  });

  it("upserts ADMIN when enabled", async () => {
    findUserMock.mockResolvedValue({ id: "user-1" } as never);
    roleMock.mockResolvedValue({ id: "role-1" } as never);
    await setAdminRole("user-1", true);
    expect(upsertMock).toHaveBeenCalled();
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it("removes ADMIN when disabled", async () => {
    findUserMock.mockResolvedValue({ id: "user-1" } as never);
    roleMock.mockResolvedValue({ id: "role-1" } as never);
    await setAdminRole("user-1", false);
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { userId: "user-1", roleId: "role-1" },
    });
  });
});
