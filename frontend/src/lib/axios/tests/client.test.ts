import { beforeEach, describe, expect, it, vi } from "vitest";

type TestRequestConfig = {
  headers: Record<string, string>;
  _authRetry?: boolean;
  _sessionVersion?: number;
  signal?: AbortSignal;
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
        error instanceof Error && error.message.endsWith("superseded"),
      CanceledError: Error,
    },
  };
});

import {
  getAccessToken,
  getAuthRequestVersion,
  invalidateSessionRequests,
  setAccessToken,
} from "@/lib/auth/access-token";
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
      _sessionVersion: getAuthRequestVersion(),
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
      _sessionVersion: getAuthRequestVersion(),
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
          _sessionVersion: getAuthRequestVersion(),
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

describe("mutation isolation across session changes", () => {
  beforeEach(() => {
    cancelSessionRefresh();
    axiosMocks.apiClient.mockClear();
    axiosMocks.refreshClient.post.mockReset();
    axiosMocks.isAxiosError.mockReturnValue(true);
    setAccessToken("account-a-token");
  });

  const mutationConfig = () =>
    axiosMocks.getRequestInterceptor()!({
      url: "/system/email-verification",
      headers: {},
    });

  it.each(["logout", "login", "restore"])(
    "does not refresh/replay a delayed 401 after %s",
    async (action) => {
      const config = mutationConfig();
      if (action === "logout") cancelSessionRefresh();
      else if (action === "login") setAccessToken("account-b-token");
      else invalidateSessionRequests();
      await expect(
        axiosMocks.getResponseErrorInterceptor()!({
          config,
          response: { status: 401 },
        }),
      ).rejects.toThrow("Session request superseded");
      expect(axiosMocks.refreshClient.post).not.toHaveBeenCalled();
      expect(axiosMocks.apiClient).not.toHaveBeenCalled();
    },
  );

  it("rejects reusing an old request config with a new account token", () => {
    const config = mutationConfig();
    setAccessToken("account-b-token");
    expect(() => axiosMocks.getRequestInterceptor()!(config)).toThrow(
      "Session request superseded",
    );
    expect(config.headers.Authorization).toBe("Bearer account-a-token");
  });

  it.each(["logout", "login", "abort"])(
    "does not replay a mutation when %s supersedes pending refresh",
    async (action) => {
      let resolve!: (value: unknown) => void;
      axiosMocks.refreshClient.post.mockImplementation(
        () =>
          new Promise((done) => {
            resolve = done;
          }),
      );
      const controller = new AbortController();
      const config = { ...mutationConfig(), signal: controller.signal };
      const pending = axiosMocks.getResponseErrorInterceptor()!({
        config,
        response: { status: 401 },
      });
      const rejected = expect(pending).rejects.toThrow(/superseded/);
      if (action === "logout") cancelSessionRefresh();
      else if (action === "login") setAccessToken("account-b-token");
      else controller.abort();
      resolve({ data: { data: { accessToken: "rotated-a-token" } } });
      await rejected;
      expect(axiosMocks.apiClient).not.toHaveBeenCalled();
      expect(getAccessToken()).toBe(
        action === "login"
          ? "account-b-token"
          : action === "logout"
            ? null
            : "rotated-a-token",
      );
    },
  );

  it("replays concurrent same-session requests after one rotation and does not invalidate their versions", async () => {
    let resolve!: (value: unknown) => void;
    axiosMocks.refreshClient.post.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    axiosMocks.apiClient.mockResolvedValue({ data: "retried" });
    const configs = [mutationConfig(), mutationConfig()];
    const version = getAuthRequestVersion();
    const pending = configs.map((config) =>
      axiosMocks.getResponseErrorInterceptor()!({
        config,
        response: { status: 401 },
      }),
    );
    resolve({ data: { data: { accessToken: "rotated-a-token" } } });
    await Promise.all(pending);
    expect(axiosMocks.refreshClient.post).toHaveBeenCalledOnce();
    expect(axiosMocks.apiClient).toHaveBeenCalledTimes(2);
    expect(getAuthRequestVersion()).toBe(version);
    expect(
      configs.every(
        (config) => config.headers.Authorization === "Bearer rotated-a-token",
      ),
    ).toBe(true);
    const alreadyRetried = { config: configs[0], response: { status: 401 } };
    await expect(
      axiosMocks.getResponseErrorInterceptor()!(alreadyRetried),
    ).rejects.toBe(alreadyRetried);
    expect(axiosMocks.refreshClient.post).toHaveBeenCalledOnce();
  });

  it("starts a fresh restoration while a superseded refresh completes and preserves its single-flight", async () => {
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
    const rejected = expect(old).rejects.toThrow("Session refresh superseded");
    invalidateSessionRequests();
    const current = refreshAccessToken();
    expect(getAccessToken()).toBe("account-a-token");
    resolveOld({ data: { data: { accessToken: "old" } } });
    await rejected;
    expect(refreshAccessToken()).toBe(current);
    resolveNew({ data: { data: { accessToken: "new" } } });
    await expect(current).resolves.toBe("new");
  });
});
