import { describe, expect, it } from "vitest";

import { canReadAuditLogs } from "./permissions";

describe("audit permissions", () => {
  it("only enables the audit UI when audit:read is present", () => {
    expect(canReadAuditLogs(["audit:read"])).toBe(true);
    expect(canReadAuditLogs(["users:read"])).toBe(false);
  });
});
