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

const AUTH_FLOW_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
];

// Nhận biết request thuộc luồng auth để không tự gắn/retry access token sai ngữ cảnh.
function isAuthFlowRequest(url: string | undefined): boolean {
  return AUTH_FLOW_PATHS.some((path) => url?.endsWith(path));
}

// Gọi endpoint refresh bằng Axios client riêng để tránh interceptor tự gọi lặp vô hạn.
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<RefreshResponse>("/auth/refresh")
      .then((response) => {
        const token = response.data.data.accessToken;
        setAccessToken(token);
        return token;
      })
      .catch((error: unknown) => {
        clearAccessToken();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
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
  } catch {
    return Promise.reject(error);
  }
});
