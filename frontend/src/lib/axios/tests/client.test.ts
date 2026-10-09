import { beforeEach, describe, expect, it, vi } from "vitest";

type TestRequestConfig = {
  headers: Record<string, string>;
  _authRetry?: boolean;
  url?: string;
};

type AxiosLikeError = {
  config?: TestRequestConfig;
  response?: { status: number; data?: { error?: { code: string } } };
};

const axiosMocks = vi.hoisted(() => {
  let requestInterceptor:
    ((config: TestRequestConfig) => TestRequestConfig) | null = null;
  let responseErrorInterceptor:
    ((error: AxiosLikeError) => Promise<unknown>) | null = null;

  const apiClient = Object.assign(vi.fn(), {
    interceptors: {
      request: {
        use: vi.fn(
          (handler: (config: TestRequestConfig) => TestRequestConfig) => {
            requestInterceptor = handler;
          },
        ),
      },
      response: {
        use: vi.fn(
          (
            _successHandler: undefined,
            errorHandler: (error: AxiosLikeError) => Promise<unknown>,
          ) => {
            responseErrorInterceptor = errorHandler;
          },
        ),
      },
    },
  });

  const refreshClient = {
    post: vi.fn(),
  };

  return {
    apiClient,
    refreshClient,
    create: vi.fn(),
    isAxiosError: vi.fn(),
    getRequestInterceptor: () => requestInterceptor,
    getResponseErrorInterceptor: () => responseErrorInterceptor,
  };
});

vi.mock("axios", () => {
  axiosMocks.create
    .mockReturnValueOnce(axiosMocks.apiClient)
    .mockReturnValueOnce(axiosMocks.refreshClient);

  return {
    default: {
      create: axiosMocks.create,
      isAxiosError: axiosMocks.isAxiosError,
      isCancel: (error: unknown) =>
        error instanceof Error &&
        error.message === "Session refresh superseded",
      CanceledError: Error,
    },
  };
});

import { getAccessToken, setAccessToken } from "@/lib/auth/access-token";
import {
  cancelSessionRefresh,
  isInvalidRefreshCredential,
  refreshAccessToken,
} from "../client";

describe("Axios auth client", () => {
  beforeEach(() => {
    cancelSessionRefresh();
    axiosMocks.apiClient.mockClear();
    axiosMocks.refreshClient.post.mockReset();
    axiosMocks.isAxiosError.mockReturnValue(true);
  });

  it("adds the in-memory access token to the Authorization header", () => {
    setAccessToken("access-token");
    const interceptor = axiosMocks.getRequestInterceptor();

    expect(interceptor?.({ headers: {} })).toEqual({
      headers: {
        Authorization: "Bearer access-token",
      },
    });
  });

  it("does not attach an access token to public authentication requests", () => {
    setAccessToken("stale-access-token");
    const interceptor = axiosMocks.getRequestInterceptor();

    expect(interceptor?.({ headers: {}, url: "/auth/login" })).toEqual({
      headers: {},
      url: "/auth/login",
    });
  });

  it("does not attach an access token to public email verification", () => {
    setAccessToken("stale-access-token");
    const interceptor = axiosMocks.getRequestInterceptor();

    expect(
      interceptor?.({
        headers: {},
        url: "/auth/email-verification/verify",
      }),
    ).toEqual({
      headers: {},
      url: "/auth/email-verification/verify",
    });
  });

  it("shares one refresh request between concurrent callers", async () => {
    axiosMocks.refreshClient.post.mockResolvedValue({
      data: {
        data: {
          accessToken: "new-access-token",
          accessTokenExpiresInSeconds: 900,
        },
      },
    });

    const firstRefresh = refreshAccessToken();
    const secondRefresh = refreshAccessToken();

    await expect(firstRefresh).resolves.toBe("new-access-token");
    await expect(secondRefresh).resolves.toBe("new-access-token");
    expect(axiosMocks.refreshClient.post).toHaveBeenCalledTimes(1);
  });

  it("refreshes and retries an authenticated request only once", async () => {
    axiosMocks.refreshClient.post.mockResolvedValue({
      data: {
        data: {
          accessToken: "rotated-access-token",
          accessTokenExpiresInSeconds: 900,
        },
      },
    });
    axiosMocks.apiClient.mockResolvedValue({ data: "retried" });

    const config: TestRequestConfig = {
      headers: { Authorization: "Bearer expired-token" },
    };
    const interceptor = axiosMocks.getResponseErrorInterceptor();

    await interceptor?.({ config, response: { status: 401 } });

    expect(config._authRetry).toBe(true);
    expect(config.headers.Authorization).toBe("Bearer rotated-access-token");
    expect(axiosMocks.apiClient).toHaveBeenCalledTimes(1);
  });

  it("does not refresh a failed public authentication request", async () => {
    const config: TestRequestConfig = {
      headers: { Authorization: "Bearer stale-token" },
      url: "/auth/login",
    };
    const error = { config, response: { status: 401 } };
    const interceptor = axiosMocks.getResponseErrorInterceptor();

    await expect(interceptor?.(error)).rejects.toBe(error);
    expect(axiosMocks.refreshClient.post).not.toHaveBeenCalled();
  });
});

describe("refresh failure classification", () => {
  beforeEach(() => {
    cancelSessionRefresh();
    axiosMocks.refreshClient.post.mockReset();
    axiosMocks.isAxiosError.mockReturnValue(true);
  });

  it.each(["INVALID_REFRESH_TOKEN", "REFRESH_TOKEN_REUSED"])(
    "recognizes only confirmed refresh credential rejection: %s",
    async (code) => {
      const error = {
        config: { url: "/auth/refresh" },
        response: { status: 401, data: { error: { code } } },
      };
      setAccessToken("old-token");
      axiosMocks.refreshClient.post.mockRejectedValue(error);
      await expect(refreshAccessToken()).rejects.toBe(error);
      expect(isInvalidRefreshCredential(error)).toBe(true);
      expect(getAccessToken()).toBeNull();
    },
  );

  it.each([undefined, 500, 503, 429, 401])(
    "keeps the session token and propagates a temporary/unknown refresh failure (%s)",
    async (status) => {
      const error = {
        config: { url: "/auth/refresh", headers: {} },
        ...(status ? { response: { status, data: {} } } : {}),
      };
      setAccessToken("old-token");
      axiosMocks.refreshClient.post.mockRejectedValue(error);
      const intercepted = {
        config: {
          url: "/files",
          headers: { Authorization: "Bearer old-token" },
        },
        response: { status: 401 },
      };
      await expect(
        axiosMocks.getResponseErrorInterceptor()?.(intercepted),
      ).rejects.toBe(error);
      expect(getAccessToken()).toBe("old-token");
      expect(isInvalidRefreshCredential(error)).toBe(false);
    },
  );

  it("does not interpret a /me rejection as refresh credential evidence", () => {
    expect(
      isInvalidRefreshCredential({
        config: { url: "/auth/me" },
        response: {
          status: 401,
          data: { error: { code: "INVALID_REFRESH_TOKEN" } },
        },
      }),
    ).toBe(false);
  });

  it("does not resurrect a token when logout supersedes an outstanding refresh", async () => {
    let resolve!: (value: unknown) => void;
    axiosMocks.refreshClient.post.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const refreshing = refreshAccessToken();
    cancelSessionRefresh();
    resolve({ data: { data: { accessToken: "late-token" } } });
    await expect(refreshing).rejects.toThrow("Session refresh superseded");
    expect(getAccessToken()).toBeNull();
  });

  it("does not overwrite the token from a newer login", async () => {
    let resolve!: (value: unknown) => void;
    axiosMocks.refreshClient.post.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const refreshing = refreshAccessToken();
    setAccessToken("login-token");
    resolve({ data: { data: { accessToken: "late-token" } } });
    await expect(refreshing).rejects.toThrow("Session refresh superseded");
    expect(getAccessToken()).toBe("login-token");
  });

  it("keeps a newer refresh single-flight when an aborted request completes late", async () => {
    let resolveOld!: (value: unknown) => void;
    let resolveNew!: (value: unknown) => void;
    axiosMocks.refreshClient.post
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolveOld = done;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolveNew = done;
          }),
      );
    const old = refreshAccessToken();
    cancelSessionRefresh();
    const current = refreshAccessToken();
    resolveOld({ data: { data: { accessToken: "old" } } });
    await expect(old).rejects.toThrow();
    expect(refreshAccessToken()).toBe(current);
    resolveNew({ data: { data: { accessToken: "new" } } });
    await expect(current).resolves.toBe("new");
  });
});
