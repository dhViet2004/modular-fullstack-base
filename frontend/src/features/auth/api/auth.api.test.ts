import { beforeEach, describe, expect, it, vi } from "vitest";

const postMock = vi.hoisted(() => vi.fn());
const getMock = vi.hoisted(() => vi.fn());
const refreshAccessTokenMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/axios/client", () => ({
  apiClient: { get: getMock, post: postMock },
  refreshAccessToken: refreshAccessTokenMock,
}));

import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth/access-token";
import {
  logoutUser,
  getGoogleOAuthStartUrl,
  requestEmailVerification,
  restoreAuthenticatedSession,
  verifyEmail,
} from "./auth.api";

describe("logoutUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAccessToken();
  });

  it("clears the in-memory access token even when the request fails", async () => {
    setAccessToken("access-token");
    postMock.mockRejectedValue(new Error("network error"));

    await expect(logoutUser()).rejects.toThrow("network error");
    expect(getAccessToken()).toBeNull();
  });
});

describe("email verification API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests an email without sending an address or token", async () => {
    postMock.mockResolvedValue({ data: { data: { accepted: true } } });

    await requestEmailVerification();

    expect(postMock).toHaveBeenCalledWith(
      "/auth/email-verification/request",
    );
  });

  it("posts the raw token only to the verify endpoint", async () => {
    postMock.mockResolvedValue({
      data: {
        data: {
          user: {
            id: "user-id",
            email: "user@example.com",
            displayName: null,
            status: "ACTIVE",
            emailVerifiedAt: "2026-09-26T00:00:00.000Z",
            createdAt: "2026-09-25T00:00:00.000Z",
            updatedAt: "2026-09-26T00:00:00.000Z",
          },
        },
      },
    });

    await verifyEmail("raw-token");

    expect(postMock).toHaveBeenCalledWith(
      "/auth/email-verification/verify",
      { token: "raw-token" },
    );
  });
});

describe("Google OAuth frontend flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts OAuth at the backend without exposing client credentials", () => {
    const url = getGoogleOAuthStartUrl();

    expect(url).toBe("http://localhost:4000/api/v1/auth/google/start");
    expect(url).not.toContain("client_id");
    expect(url).not.toContain("client_secret");
  });

  it("restores the internal session after the Google callback", async () => {
    refreshAccessTokenMock.mockResolvedValue("access-token");
    getMock.mockResolvedValue({
      data: {
        data: {
          user: {
            id: "user-id",
            email: "user@example.com",
            displayName: "User",
            status: "ACTIVE",
            emailVerifiedAt: "2026-09-26T00:00:00.000Z",
            createdAt: "2026-09-26T00:00:00.000Z",
            updatedAt: "2026-09-26T00:00:00.000Z",
          },
          access: { roles: ["MEMBER"], permissions: [] },
        },
      },
    });

    await expect(restoreAuthenticatedSession()).resolves.toMatchObject({
      id: "user-id",
      roles: ["MEMBER"],
    });
    expect(refreshAccessTokenMock).toHaveBeenCalledOnce();
    expect(getMock).toHaveBeenCalledWith("/auth/me");
  });
});
