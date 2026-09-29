import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));
vi.mock("../../../core/database/prisma.js", () => ({
  prisma: { passwordCredential: db },
}));
vi.mock("argon2", () => ({
  default: {
    argon2id: 2,
    hash: vi.fn(() => Promise.resolve("new-hash")),
    verify: vi.fn(() => Promise.resolve(false)),
  },
}));

import { authService } from "../auth.service.js";

describe("password credential", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lets an authenticated passwordless account set its first password", async () => {
    db.findUnique.mockResolvedValue(null);
    await authService.changePassword("user-id", {
      newPassword: "a-long-new-password",
    });
    expect(db.create).toHaveBeenCalledWith({
      data: { userId: "user-id", passwordHash: "new-hash" },
    });
  });

  it("requires the old password when a credential exists", async () => {
    db.findUnique.mockResolvedValue({ passwordHash: "old-hash" });
    await expect(
      authService.changePassword("user-id", {
        newPassword: "a-long-new-password",
      }),
    ).rejects.toMatchObject({ code: "INVALID_CURRENT_PASSWORD" });
    expect(db.update).not.toHaveBeenCalled();
  });
});
