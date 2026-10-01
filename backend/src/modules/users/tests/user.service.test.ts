import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../../../core/database/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    role: { findUniqueOrThrow: vi.fn() },
    userRole: { upsert: vi.fn(), deleteMany: vi.fn() },
  },
}));

import { prisma } from "../../../core/database/prisma.js";
import { userService } from "../user.service.js";

// Prisma methods are mocks; direct references are intentional test seams.
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

  it("upserts ADMIN when enabled", async () => {
    findUserMock.mockResolvedValue({ id: "user-1" } as never);
    roleMock.mockResolvedValue({ id: "role-1" } as never);
    await userService.setAdminRole("user-1", true);
    expect(upsertMock).toHaveBeenCalled();
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it("removes ADMIN when disabled", async () => {
    findUserMock.mockResolvedValue({ id: "user-1" } as never);
    roleMock.mockResolvedValue({ id: "role-1" } as never);
    await userService.setAdminRole("user-1", false);
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { userId: "user-1", roleId: "role-1" },
    });
  });
});
