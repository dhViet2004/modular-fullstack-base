import { describe, expect, it } from "vitest";

import {
  PERMISSIONS,
  ROLE_CODES,
  ROLE_PERMISSIONS,
} from "./permission.catalog.js";

describe("permission catalog", () => {
  it("grants audit:read to ADMIN only", () => {
    expect(ROLE_PERMISSIONS[ROLE_CODES.SUPER_ADMIN]).toContain(
      PERMISSIONS.AUDIT_READ,
    );
    expect(ROLE_PERMISSIONS[ROLE_CODES.ADMIN]).toContain(
      PERMISSIONS.AUDIT_READ,
    );
    expect(ROLE_PERMISSIONS[ROLE_CODES.MEMBER]).not.toContain(
      PERMISSIONS.AUDIT_READ,
    );
  });

  it("defines three roles and keeps member permissions limited", () => {
    expect(Object.values(ROLE_CODES)).toEqual([
      "SUPER_ADMIN",
      "ADMIN",
      "MEMBER",
    ]);
    expect(ROLE_PERMISSIONS[ROLE_CODES.SUPER_ADMIN]).toContain(
      PERMISSIONS.ROLES_MANAGE,
    );
    expect(ROLE_PERMISSIONS[ROLE_CODES.MEMBER]).not.toContain(
      PERMISSIONS.USERS_READ,
    );
  });
});
