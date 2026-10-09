import { describe, expect, it } from "vitest";

import {
  canReadAuditLogs,
  getNavigationItems,
  getRoleFlags,
} from "../permissions";

const memberLinks = [
  "/account",
  "/account?tab=sessions",
  "/account/files",
  "/account?tab=security",
];

describe("audit permissions", () => {
  it("only enables the audit UI when audit:read is present", () => {
    expect(canReadAuditLogs(["audit:read"])).toBe(true);
    expect(canReadAuditLogs(["users:read"])).toBe(false);
  });
});

describe("role navigation", () => {
  it("shows the existing self-service views without invented permissions", () => {
    expect(getNavigationItems(["MEMBER"], []).map((item) => item.href)).toEqual(
      memberLinks,
    );
  });

  it("shows admin pages only when backend grants their permissions", () => {
    expect(
      getNavigationItems(["ADMIN", "MEMBER"], ["users:read"]).map(
        (item) => item.href,
      ),
    ).toEqual(["/admin", "/admin/users", ...memberLinks]);
  });

  it("prioritizes super admin and preserves permission checks", () => {
    const roles = ["SUPER_ADMIN", "ADMIN", "MEMBER"];
    expect(getRoleFlags(roles).isSuperAdmin).toBe(true);
    expect(
      getNavigationItems(roles, ["users:read", "audit:read"]).map(
        (item) => item.href,
      ),
    ).toEqual([
      "/super-admin",
      "/admin/users",
      "/admin/audit-logs",
      "/super-admin?tab=email-verification",
      "/super-admin?tab=rbac",
      ...memberLinks,
    ]);
  });
});
