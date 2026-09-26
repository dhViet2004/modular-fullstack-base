import { describe, expect, it } from "vitest";

import { getPostLoginPath } from "../post-login-route";

describe("getPostLoginPath", () => {
  it("routes users with users:read to the admin interface", () => {
    expect(getPostLoginPath(["users:read"])).toBe("/admin/users");
  });

  it("routes regular users to their account page", () => {
    expect(getPostLoginPath(["profile:read:self"])).toBe("/account");
  });
});
