import { beforeEach, describe, expect, it, vi } from "vitest";

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
});
