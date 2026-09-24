import { describe, expect, it } from "vitest";

import { readRefreshTokenCookie } from "./refresh-token-cookie.js";

describe("refresh token cookie", () => {
  it("reads and decodes the refresh token from multiple cookies", () => {
    expect(
      readRefreshTokenCookie(
        "theme=light; refresh_token=session-id.secret%2Bvalue; locale=vi",
      ),
    ).toBe("session-id.secret+value");
  });

  it("returns null for a missing or malformed refresh cookie", () => {
    expect(readRefreshTokenCookie(undefined)).toBeNull();
    expect(readRefreshTokenCookie("theme=light")).toBeNull();
    expect(readRefreshTokenCookie("refresh_token=%E0%A4%A")).toBeNull();
  });
});
