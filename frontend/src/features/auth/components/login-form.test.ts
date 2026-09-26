import { describe, expect, it } from "vitest";

import { getPostLoginPath } from "../post-login-route";

describe("getPostLoginPath", () => {
  it("routes users with users:read to the admin interface", () => {
    expect(getPostLoginPath(["users:read"])).toBe("/admin/users");
  });

  it("keeps regular users outside the admin interface", () => {
    expect(getPostLoginPath(["profile:read:self"])).toBeNull();
  });
});
