import { createHash, randomBytes } from "node:crypto";

export type GeneratedGoogleOAuthAttempt = {
  state: string;
  stateHash: string;
  codeVerifier: string;
  codeChallenge: string;
};

// Băm state trước khi persist để database không chứa giá trị callback dùng trực tiếp.
export function hashGoogleOAuthState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

function createCodeChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

// Sinh state chống CSRF và cặp PKCE S256 cho một lần bắt đầu Google OAuth.
export function generateGoogleOAuthAttempt(): GeneratedGoogleOAuthAttempt {
  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(32).toString("base64url");

  return {
    state,
    stateHash: hashGoogleOAuthState(state),
    codeVerifier,
    codeChallenge: createCodeChallenge(codeVerifier),
  };
}
