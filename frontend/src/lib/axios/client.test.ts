import { beforeEach, describe, expect, it, vi } from "vitest";

type TestRequestConfig = {
  headers: Record<string, string>;
  _authRetry?: boolean;
  url?: string;
};

type AxiosLikeError = {
  config?: TestRequestConfig;
  response?: { status: number };
};

const axiosMocks = vi.hoisted(() => {
  let requestInterceptor: ((config: TestRequestConfig) => TestRequestConfig) | null =
    null;
  let responseErrorInterceptor:
    | ((error: AxiosLikeError) => Promise<unknown>)
    | null = null;

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
    },
  };
});

import {
  clearAccessToken,
  setAccessToken,
} from "@/lib/auth/access-token";
import { refreshAccessToken } from "./client";

describe("Axios auth client", () => {
  beforeEach(() => {
    clearAccessToken();
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

    expect(
      interceptor?.({ headers: {}, url: "/auth/login" }),
    ).toEqual({ headers: {}, url: "/auth/login" });
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
