import { beforeEach, describe, expect, it, vi } from "vitest";

const postMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/axios/client", () => ({
  apiClient: { post: postMock },
}));

import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth/access-token";
import {
  logoutUser,
  requestEmailVerification,
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
