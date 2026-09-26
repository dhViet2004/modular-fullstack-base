import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";

import { env } from "../../../config/env.js";
import { ApplicationError } from "../../../core/http/application-error.js";

const GOOGLE_AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const googleJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

const googleTokenResponseSchema = z.object({ id_token: z.string().min(1) });
const googleIdentitySchema = z.object({
  sub: z.string().min(1),
  email: z.string().trim().email(),
  email_verified: z.literal(true),
  name: z.string().min(1).optional(),
});

function googleConfiguration() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new ApplicationError(
      503,
      "GOOGLE_OAUTH_NOT_CONFIGURED",
      "Đăng nhập Google chưa được cấu hình",
    );
  }

  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
  };
}

function googleLoginError() {
  return new ApplicationError(
    401,
    "GOOGLE_LOGIN_FAILED",
    "Không thể đăng nhập bằng Google",
  );
}

// Dựng authorization URL từ config đã validate, state và PKCE challenge.
export function createGoogleAuthorizationUrl(
  state: string,
  codeChallenge: string,
): string {
  const config = googleConfiguration();
  const url = new URL(GOOGLE_AUTHORIZATION_URL);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url.toString();
}

// Đổi authorization code bằng verifier; không log request hoặc token response.
export async function exchangeGoogleAuthorizationCode(
  code: string,
  codeVerifier: string,
): Promise<string> {
  const config = googleConfiguration();

  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) throw googleLoginError();
    return googleTokenResponseSchema.parse(await response.json()).id_token;
  } catch {
    throw googleLoginError();
  }
}

export type GoogleIdentity = {
  googleSubject: string;
  email: string;
  displayName: string | null;
};

// Xác minh chữ ký, issuer, audience và email_verified trước khi tin claims Google.
export async function verifyGoogleIdToken(
  idToken: string,
): Promise<GoogleIdentity> {
  const config = googleConfiguration();

  try {
    const { payload } = await jwtVerify(idToken, googleJwks, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: config.clientId,
    });
    const identity = googleIdentitySchema.parse(payload);

    return {
      googleSubject: identity.sub,
      email: identity.email.trim().toLowerCase(),
      displayName: identity.name?.trim() || null,
    };
  } catch {
    throw googleLoginError();
  }
}
