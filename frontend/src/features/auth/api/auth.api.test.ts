import { beforeEach, describe, expect, it, vi } from "vitest";

const postMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/axios/client", () => ({
  apiClient: { post: postMock },
}));

import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth/access-token";
import { logoutUser } from "./auth.api";

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
