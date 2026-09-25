import { describe, expect, it, vi } from "vitest";

const createUserMock = vi.hoisted(() => vi.fn());

vi.mock("../../../core/database/prisma.js", () => ({
  prisma: {
    user: {
      create: createUserMock,
    },
  },
}));

import { ROLE_CODES } from "../../access/permission.catalog.js";
import { createPasswordUser } from "./register.repository.js";

describe("register repository", () => {
  it("creates password credential and MEMBER assignment atomically", async () => {
    await createPasswordUser({
      email: "user@example.com",
      displayName: "User",
      passwordHash: "password-hash",
    });

    const call = createUserMock.mock.calls[0]?.[0] as {
      data: {
        passwordCredential: { create: { passwordHash: string } };
        roles: { create: { role: { connect: { code: string } } } };
      };
    };

    expect(call.data.passwordCredential.create.passwordHash).toBe(
      "password-hash",
    );
    expect(call.data.roles.create.role.connect.code).toBe(ROLE_CODES.MEMBER);
  });
});
