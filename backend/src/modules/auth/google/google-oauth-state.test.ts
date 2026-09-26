import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  generateGoogleOAuthAttempt,
  hashGoogleOAuthState,
} from "./google-oauth-state.js";

describe("Google OAuth state and PKCE", () => {
  it("generates URL-safe state and verifier with SHA-256 derivatives", () => {
    const attempt = generateGoogleOAuthAttempt();

    expect(attempt.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(attempt.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(attempt.stateHash).toBe(hashGoogleOAuthState(attempt.state));
    expect(attempt.stateHash).toMatch(/^[a-f0-9]{64}$/);
    expect(attempt.codeChallenge).toBe(
      createHash("sha256").update(attempt.codeVerifier).digest("base64url"),
    );
  });

  it("generates independent attempts", () => {
    const first = generateGoogleOAuthAttempt();
    const second = generateGoogleOAuthAttempt();

    expect(first.state).not.toBe(second.state);
    expect(first.codeVerifier).not.toBe(second.codeVerifier);
  });
});
