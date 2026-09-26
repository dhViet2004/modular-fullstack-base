"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  restoreAuthenticatedSession,
  type AuthenticatedUser,
} from "../api/auth.api";

type AuthContextValue = {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  setAuthenticatedUser: (user: AuthenticatedUser) => void;
  clearAuthenticatedUser: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Khôi phục phiên đăng nhập từ HttpOnly refresh cookie khi ứng dụng được tải lại.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Function bên trong effect được dùng vì callback của useEffect không được trả Promise.
    async function restoreSession() {
      try {
        const currentUser = await restoreAuthenticatedSession();

        if (isMounted) {
          setUser(currentUser);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void restoreSession();

    // Cleanup ngăn effect cập nhật state sau khi component đã unmount.
    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      setAuthenticatedUser: setUser,
      clearAuthenticatedUser: () => setUser(null),
    }),
    [isLoading, user],
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
