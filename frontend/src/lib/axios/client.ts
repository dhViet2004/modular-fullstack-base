import axios, { type InternalAxiosRequestConfig } from "axios";

import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth/access-token";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export const apiClient = axios.create({
  baseURL,
  timeout: 10_000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

const refreshClient = axios.create({
  baseURL,
  timeout: 10_000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _authRetry?: boolean;
};

type RefreshResponse = {
  success: true;
  data: {
    accessToken: string;
    accessTokenExpiresInSeconds: number;
  };
};

let refreshPromise: Promise<string> | null = null;
let refreshController: AbortController | null = null;

export function isInvalidRefreshCredential(error: unknown): boolean {
  return (
    axios.isAxiosError<{ error?: { code?: string } }>(error) &&
    error.config?.url?.endsWith("/auth/refresh") === true &&
    error.response?.status === 401 &&
    ["INVALID_REFRESH_TOKEN", "REFRESH_TOKEN_REUSED"].includes(
      error.response.data?.error?.code ?? "",
    )
  );
}

// Abort outstanding refreshes before logout so they cannot restore a logged-out session.
export function cancelSessionRefresh(): void {
  refreshController?.abort();
  refreshController = null;
  refreshPromise = null;
  clearAccessToken();
}

const AUTH_FLOW_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
  "/auth/email-verification/verify",
];

// Nhận biết request thuộc luồng auth để không tự gắn/retry access token sai ngữ cảnh.
function isAuthFlowRequest(url: string | undefined): boolean {
  return AUTH_FLOW_PATHS.some((path) => url?.endsWith(path));
}

// Gọi endpoint refresh bằng Axios client riêng để tránh interceptor tự gọi lặp vô hạn.
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    const controller = new AbortController();
    const previousToken = getAccessToken();
    refreshController = controller;
    refreshPromise = refreshClient
      .post<RefreshResponse>("/auth/refresh", undefined, {
        signal: controller.signal,
      })
      .then((response) => {
        if (controller.signal.aborted || getAccessToken() !== previousToken) {
          throw new axios.CanceledError("Session refresh superseded");
        }
        const token = response.data.data.accessToken;
        setAccessToken(token);
        return token;
      })
      .catch((error: unknown) => {
        if (
          !controller.signal.aborted &&
          getAccessToken() === previousToken &&
          !axios.isCancel(error)
        ) {
          if (isInvalidRefreshCredential(error)) clearAccessToken();
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("auth:refresh-failed", { detail: error }),
            );
          }
        }
        throw error;
      })
      .finally(() => {
        if (refreshController === controller) {
          refreshController = null;
          refreshPromise = null;
        }
      });
  }

  return refreshPromise;
}

// Gắn access token hiện tại vào Authorization header trước khi gửi request.
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token && !isAuthFlowRequest(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Khi request có Bearer token nhận 401, refresh một lần rồi gửi lại request ban đầu.
apiClient.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return Promise.reject(error);
  }

  const config = error.config as RetryableRequestConfig | undefined;
  const hadAccessToken = Boolean(config?.headers.Authorization);

  if (
    error.response?.status !== 401 ||
    !config ||
    config._authRetry ||
    !hadAccessToken ||
    isAuthFlowRequest(config.url)
  ) {
    return Promise.reject(error);
  }

  config._authRetry = true;

  try {
    const token = await refreshAccessToken();
    config.headers.Authorization = `Bearer ${token}`;
    return apiClient(config);
  } catch (refreshError: unknown) {
    return Promise.reject(refreshError);
  }
});
