import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { ApplicationError } from "../../core/http/application-error.js";

vi.mock("./user.repository.js", () => ({
  createUser: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
}));

import {
  createUser as createUserRecord,
  findUserByEmail,
} from "./user.repository.js";
import { createUser, getUserByEmail } from "./user.service.js";

const createUserRecordMock = vi.mocked(createUserRecord);
const findUserByEmailMock = vi.mocked(findUserByEmail);

describe("user service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes email and display name before creating a user", async () => {
    await createUser({
      email: "user@Example.COM",
      displayName: "      Đặng Hoàng Việt     ",
    });

    expect(createUserRecordMock).toHaveBeenCalledWith({
      email: "user@example.com",
      displayName: "Đặng Hoàng Việt",
    });
  });

  it("converts an empty display name to null", async () => {
    await createUser({
      email: "user@example.com",
      displayName: "          ",
    });

    expect(createUserRecordMock).toHaveBeenCalledWith({
      email: "user@example.com",
      displayName: null,
    });
  });

  it("normalizes email before finding a user", async () => {
    await getUserByEmail("  User@Example.COM  ");

    expect(findUserByEmailMock).toHaveBeenCalledWith("user@example.com");
  });

  it("converts a duplicate email error into an application error", async () => {
    createUserRecordMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.19.3",
        meta: {
          target: ["email"],
        },
      }),
    );

    await expect(
      createUser({
        email: "user@example.com",
        displayName: "User",
      }),
    ).rejects.toEqual(
      new ApplicationError(
        409,
        "USER_EMAIL_ALREADY_EXISTS",
        "A user with this email already exists",
      ),
    );
  });
});
