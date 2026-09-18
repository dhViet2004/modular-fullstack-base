export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  mustChangePassword?: boolean;
  roles: { name: string; rank: number }[];
  permissions?: string[];
};
export type AuthResult = { accessToken: string; refreshToken: string; session: { id: string }; user?: AuthUser };
const ACCESS = "corestack.access",
  SESSION = "corestack.session",
  REFRESH = "corestack.refresh",
  USER = "corestack.user";
export const authClient = {
  getAccess: () => (typeof window === "undefined" ? null : localStorage.getItem(ACCESS)),
  getUser: (): AuthUser | null => {
    if (typeof window === "undefined") return null;
    const value = localStorage.getItem(USER);
    if (!value) return null;
    try {
      return JSON.parse(value) as AuthUser;
    } catch {
      return null;
    }
  },
  setTokens: (x: AuthResult) => {
    localStorage.setItem(ACCESS, x.accessToken);
    localStorage.setItem(REFRESH, x.refreshToken);
    localStorage.setItem(SESSION, x.session.id);
    if (x.user) localStorage.setItem(USER, JSON.stringify(x.user));
  },
  updateUser: (partial: Partial<AuthUser>) => {
    const current = authClient.getUser();
    if (current) {
      const updated = { ...current, ...partial };
      localStorage.setItem(USER, JSON.stringify(updated));
      return updated;
    }
    return null;
  },
  getRefresh: () => ({ refreshToken: localStorage.getItem(REFRESH), sessionId: localStorage.getItem(SESSION) }),
  clear: () => {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
    localStorage.removeItem(SESSION);
    localStorage.removeItem(USER);
  }
};
