import { describe, expect, it } from "vitest";

import { getPostLoginPath } from "../post-login-route";

describe("getPostLoginPath", () => {
  it("routes each role to its dashboard, prioritizing super admin", () => {
    expect(getPostLoginPath(["SUPER_ADMIN", "ADMIN", "MEMBER"])).toBe("/super-admin");
    expect(getPostLoginPath(["ADMIN", "MEMBER"])).toBe("/admin");
    expect(getPostLoginPath(["MEMBER"])).toBe("/account");
  });

  it("keeps unknown roles on the account page", () => {
    expect(getPostLoginPath([])).toBe("/account");
  });
});
