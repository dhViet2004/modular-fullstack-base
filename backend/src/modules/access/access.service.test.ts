import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "../../core/http/application-error.js";
import { PERMISSIONS } from "./permission.catalog.js";

vi.mock("./access.repository.js", () => ({
  findAccessContextByUserId: vi.fn(),
  userHasPermission: vi.fn(),
}));

import {
  findAccessContextByUserId,
  userHasPermission,
} from "./access.repository.js";
import {
  assertUserHasPermission,
  getUserAccessContext,
} from "./access.service.js";

const userHasPermissionMock = vi.mocked(userHasPermission);
const findAccessContextByUserIdMock = vi.mocked(findAccessContextByUserId);

describe("access service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows a user who has the required permission", async () => {
    userHasPermissionMock.mockResolvedValue(true);

    await expect(
      assertUserHasPermission("user-id", PERMISSIONS.USERS_READ),
    ).resolves.toBeUndefined();
  });

  it("returns 403 when an authenticated user lacks permission", async () => {
    userHasPermissionMock.mockResolvedValue(false);

    await expect(
      assertUserHasPermission("user-id", PERMISSIONS.USERS_READ),
    ).rejects.toEqual(
      new ApplicationError(
        403,
        "FORBIDDEN",
        "Bạn không có quyền thực hiện thao tác này",
      ),
    );
  });

  it("returns unique sorted roles and permissions", async () => {
    findAccessContextByUserIdMock.mockResolvedValue([
      {
        role: {
          code: "MEMBER",
          permissions: [
            { permission: { code: PERMISSIONS.PROFILE_READ_SELF } },
          ],
        },
      },
      {
        role: {
          code: "ADMIN",
          permissions: [
            { permission: { code: PERMISSIONS.USERS_READ } },
            { permission: { code: PERMISSIONS.PROFILE_READ_SELF } },
          ],
        },
      },
    ]);

    await expect(getUserAccessContext("user-id")).resolves.toEqual({
      roles: ["ADMIN", "MEMBER"],
      permissions: [PERMISSIONS.PROFILE_READ_SELF, PERMISSIONS.USERS_READ],
    });
  });
});
