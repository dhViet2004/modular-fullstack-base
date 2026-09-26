import { describe, expect, it } from "vitest";

import { canReadAuditLogs, getNavigationItems, getRoleFlags } from "./permissions";

describe("audit permissions", () => {
  it("only enables the audit UI when audit:read is present", () => {
    expect(canReadAuditLogs(["audit:read"])).toBe(true);
    expect(canReadAuditLogs(["users:read"])).toBe(false);
  });
});

describe("role navigation", () => {
  it("shows only the member account page", () => {
    expect(getNavigationItems(["MEMBER"], ["profile:read:self"]).map((item) => item.href)).toEqual(["/account/files", "/account"]);
  });

  it("shows admin pages only when backend grants their permissions", () => {
    expect(getNavigationItems(["ADMIN", "MEMBER"], ["users:read"]).map((item) => item.href)).toEqual(["/admin", "/admin/users", "/account/files", "/account"]);
  });

  it("prioritizes super admin and preserves permission checks", () => {
    const roles = ["SUPER_ADMIN", "ADMIN", "MEMBER"];
    expect(getRoleFlags(roles).isSuperAdmin).toBe(true);
    expect(getNavigationItems(roles, ["users:read", "audit:read"]).map((item) => item.href)).toEqual(["/super-admin", "/admin/users", "/admin/audit-logs", "/account/files", "/account"]);
  });
});
