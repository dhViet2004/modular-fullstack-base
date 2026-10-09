"use client";

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { isInvalidRefreshCredential } from "@/lib/axios/client";
import {
  clearAccessToken,
  invalidateSessionRequests,
} from "@/lib/auth/access-token";

import {
  restoreAuthenticatedSession,
  type AuthenticatedUser,
  type RegisteredUser,
} from "../api/auth.api";

type AuthContextValue = {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  status: "loading" | "authenticated" | "guest" | "expired" | "restore-error";
  retrySession: () => void;
  beginLogout: () => void;
  setAuthenticatedUser: (user: AuthenticatedUser) => void;
  updateVerifiedEmail: (user: RegisteredUser) => void;
  updatePasswordStatus: (
    user: Pick<AuthenticatedUser, "id" | "hasPassword"> & {
      updatedAt?: string;
    },
  ) => void;
  clearAuthenticatedUser: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_MARKER = "corestack.session-established";

function rememberSession(known: boolean): void {
  try {
    if (known) sessionStorage.setItem(SESSION_MARKER, "true");
    else sessionStorage.removeItem(SESSION_MARKER);
  } catch {
    // Storage may be disabled; the current tab still retains evidence in memory.
  }
}

// Khôi phục phiên đăng nhập từ HttpOnly refresh cookie khi ứng dụng được tải lại.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const previousSession = useRef(false);
  const version = useRef(0);
  const mounted = useRef(false);
  const loggingOut = useRef(false);
  const queryClient = useQueryClient();

  const setAuthenticatedUser = useCallback((currentUser: AuthenticatedUser) => {
    version.current++;
    loggingOut.current = false;
    previousSession.current = true;
    rememberSession(true);
    setUser(currentUser);
    setStatus("authenticated");
  }, []);

  const beginLogout = useCallback(() => {
    invalidateSessionRequests();
    loggingOut.current = true;
    version.current++;
    previousSession.current = false;
    rememberSession(false);
  }, []);

  const updateVerifiedEmail = useCallback((verifiedUser: RegisteredUser) => {
    setUser((currentUser) =>
      currentUser?.id === verifiedUser.id
        ? {
            ...currentUser,
            emailVerifiedAt: verifiedUser.emailVerifiedAt,
            updatedAt: verifiedUser.updatedAt,
          }
        : currentUser,
    );
  }, []);

  const updatePasswordStatus = useCallback(
    (
      updatedUser: Pick<AuthenticatedUser, "id" | "hasPassword"> & {
        updatedAt?: string;
      },
    ) => {
      if (loggingOut.current) return;
      setUser((currentUser) =>
        currentUser?.id === updatedUser.id
          ? {
              ...currentUser,
              hasPassword: updatedUser.hasPassword,
              updatedAt: updatedUser.updatedAt ?? currentUser.updatedAt,
            }
          : currentUser,
      );
    },
    [],
  );

  const clearAuthenticatedUser = useCallback(() => {
    beginLogout();
    clearAccessToken();
    setUser(null);
    setStatus("guest");
  }, [beginLogout]);

  const sessionFailed = useCallback(
    (error: unknown) => {
      if (!mounted.current || loggingOut.current || axios.isCancel(error))
        return;
      version.current++;
      if (isInvalidRefreshCredential(error)) {
        setUser(null);
        queryClient.clear();
        setStatus(previousSession.current ? "expired" : "guest");
      } else {
        setStatus("restore-error");
      }
    },
    [queryClient],
  );

  const retrySession = useCallback(() => {
    if (loggingOut.current) return;
    invalidateSessionRequests();
    const attempt = ++version.current;
    setStatus("loading");
    void restoreAuthenticatedSession()
      .then((currentUser) => {
        if (mounted.current && version.current === attempt)
          setAuthenticatedUser(currentUser);
      })
      .catch((error: unknown) => {
        if (version.current === attempt) sessionFailed(error);
      });
  }, [sessionFailed, setAuthenticatedUser]);

  useEffect(() => {
    mounted.current = true;
    try {
      previousSession.current =
        sessionStorage.getItem(SESSION_MARKER) === "true";
    } catch {
      // No persisted evidence means a rejected refresh alone cannot prove expiration.
    }
    const onRefreshFailure = (event: Event) =>
      sessionFailed((event as CustomEvent<unknown>).detail);
    window.addEventListener("auth:refresh-failed", onRefreshFailure);
    retrySession();
    return () => {
      mounted.current = false;
      window.removeEventListener("auth:refresh-failed", onRefreshFailure);
    };
  }, [retrySession, sessionFailed]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: status === "loading" && !user,
      status,
      retrySession,
      beginLogout,
      setAuthenticatedUser,
      updateVerifiedEmail,
      updatePasswordStatus,
      clearAuthenticatedUser,
    }),
    [
      status,
      user,
      retrySession,
      beginLogout,
      setAuthenticatedUser,
      updateVerifiedEmail,
      updatePasswordStatus,
      clearAuthenticatedUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Cho phép component/hook đọc trạng thái auth và báo lỗi nếu dùng ngoài AuthProvider.
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
