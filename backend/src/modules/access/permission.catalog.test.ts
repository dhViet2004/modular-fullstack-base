import { describe, expect, it } from "vitest";

import {
  PERMISSIONS,
  ROLE_CODES,
  ROLE_PERMISSIONS,
} from "./permission.catalog.js";

describe("permission catalog", () => {
  it("grants audit:read to ADMIN only", () => {
    expect(ROLE_PERMISSIONS[ROLE_CODES.ADMIN]).toContain(
      PERMISSIONS.AUDIT_READ,
    );
    expect(ROLE_PERMISSIONS[ROLE_CODES.MEMBER]).not.toContain(
      PERMISSIONS.AUDIT_READ,
    );
  });
});
