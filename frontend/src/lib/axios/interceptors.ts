import type { AxiosError, InternalAxiosRequestConfig, AxiosInstance } from "axios";
import { authClient } from "../auth/auth-client";

type Retry = InternalAxiosRequestConfig & { _retry?: boolean };

export function setupInterceptors(api: AxiosInstance): AxiosInstance {
  api.interceptors.request.use((c) => {
    const token = authClient.getAccess();
    if (token) c.headers.Authorization = `Bearer ${token}`;
    return c;
  });

  api.interceptors.response.use(
    (r) => r,
    async (error: AxiosError) => {
      const c = error.config as Retry | undefined;
      if (error.response?.status === 401 && c && !c._retry && !c.url?.includes("/auth/refresh")) {
        c._retry = true;
        const t = authClient.getRefresh();
        if (t.refreshToken && t.sessionId) {
          try {
            const r = await api.post("/auth/refresh", t);
            authClient.setTokens({ ...r.data.data, session: { id: t.sessionId } });
            return api(c);
          } catch {
            /* clear below */
          }
        }
        authClient.clear();
        if (typeof window !== "undefined") window.location.assign("/login");
      }
      return Promise.reject(error);
    }
  );

  return api;
}

export const apiError = (e: unknown) => {
  const x = e as AxiosError<{ error?: { code?: string; message?: string } }> | undefined;
  return {
    code: x?.response?.data?.error?.code ?? "UNKNOWN",
    message: x?.response?.data?.error?.message ?? "Request failed"
  };
};
