import { describe, expect, it } from "vitest";

import {
  generateEmailVerificationToken,
  hashEmailVerificationToken,
} from "./email-verification-token.js";

describe("email verification token", () => {
  it("generates a URL-safe token with a 64-character SHA-256 hash", () => {
    const generated = generateEmailVerificationToken();

    expect(generated.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generated.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(generated.tokenHash).toBe(
      hashEmailVerificationToken(generated.token),
    );
  });

  it("generates a different token for each request", () => {
    expect(generateEmailVerificationToken().token).not.toBe(
      generateEmailVerificationToken().token,
    );
  });
});
