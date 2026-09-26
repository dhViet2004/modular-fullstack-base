import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jwtVerifyMock = vi.hoisted(() => vi.fn());
const jwks = vi.hoisted(() => vi.fn());

vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn(() => jwks),
  jwtVerify: jwtVerifyMock,
}));

vi.mock("../../../config/env.js", () => ({
  env: {
    GOOGLE_CLIENT_ID: "google-client-id",
    GOOGLE_CLIENT_SECRET: "google-client-secret",
    GOOGLE_REDIRECT_URI: "http://localhost:4000/api/v1/auth/google/callback",
  },
}));

import {
  createGoogleAuthorizationUrl,
  exchangeGoogleAuthorizationCode,
  verifyGoogleIdToken,
} from "./google-oauth-client.js";

describe("Google OAuth client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates an authorization URL with state and PKCE S256", () => {
    const url = new URL(
      createGoogleAuthorizationUrl("raw-state", "pkce-challenge"),
    );

    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(url.searchParams.get("client_id")).toBe("google-client-id");
    expect(url.searchParams.get("state")).toBe("raw-state");
    expect(url.searchParams.get("code_challenge")).toBe("pkce-challenge");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("exchanges the code without exposing the client secret in the URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id_token: "google-id-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      exchangeGoogleAuthorizationCode("authorization-code", "code-verifier"),
    ).resolves.toBe("google-id-token");

    const requestUrl = fetchMock.mock.calls[0]?.[0] as string;
    const requestOptions = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(requestUrl).toBe("https://oauth2.googleapis.com/token");
    expect(requestUrl).not.toContain("google-client-secret");
    expect(requestOptions.body).toBeInstanceOf(URLSearchParams);
    expect((requestOptions.body as URLSearchParams).get("client_secret")).toBe(
      "google-client-secret",
    );
  });

  it("accepts only a signed identity with a verified email", async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: {
        sub: "google-subject",
        email: " User@Example.com ",
        email_verified: true,
        name: " Google User ",
      },
    });

    await expect(verifyGoogleIdToken("google-id-token")).resolves.toEqual({
      googleSubject: "google-subject",
      email: "user@example.com",
      displayName: "Google User",
    });
    expect(jwtVerifyMock).toHaveBeenCalledWith(
      "google-id-token",
      jwks,
      expect.objectContaining({ audience: "google-client-id" }),
    );
  });

  it("rejects an identity whose email is not verified", async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: {
        sub: "google-subject",
        email: "user@example.com",
        email_verified: false,
      },
    });

    await expect(verifyGoogleIdToken("google-id-token")).rejects.toMatchObject({
      statusCode: 401,
      code: "GOOGLE_LOGIN_FAILED",
    });
  });
});
