import { useMemo } from "react";
import { authClient, type AuthUser } from "./auth-client";

export function checkPermission(permission: string, user?: AuthUser | null): boolean {
  const u = user !== undefined ? user : authClient.getUser();
  if (!u) return false;
  // Super Admin (cấp 100 hoặc tên vai trò SUPER_ADMIN) tự động có toàn bộ quyền
  const isSuperAdmin = u.roles?.some((r) => r.rank >= 100 || r.name === "SUPER_ADMIN");
  if (isSuperAdmin) return true;
  return Boolean(u.permissions?.includes(permission));
}

export function checkAnyPermission(permissions: string[], user?: AuthUser | null): boolean {
  const u = user !== undefined ? user : authClient.getUser();
  if (!u) return false;
  const isSuperAdmin = u.roles?.some((r) => r.rank >= 100 || r.name === "SUPER_ADMIN");
  if (isSuperAdmin) return true;
  return permissions.some((p) => Boolean(u.permissions?.includes(p)));
}

export function usePermissions(user?: AuthUser | null) {
  const currentUser = user !== undefined ? user : authClient.getUser();

  const isSuperAdmin = useMemo(() => {
    return Boolean(currentUser?.roles?.some((r) => r.rank >= 100 || r.name === "SUPER_ADMIN"));
  }, [currentUser]);

  const isAdmin = useMemo(() => {
    return Boolean(currentUser?.roles?.some((r) => r.rank >= 50 || r.name === "ADMIN"));
  }, [currentUser]);

  const permissions = useMemo(() => {
    return currentUser?.permissions ?? [];
  }, [currentUser]);

  const hasPermission = (permission: string): boolean => {
    if (isSuperAdmin) return true;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (perms: string[]): boolean => {
    if (isSuperAdmin) return true;
    return perms.some((p) => permissions.includes(p));
  };

  return {
    currentUser,
    isSuperAdmin,
    isAdmin,
    permissions,
    hasPermission,
    hasAnyPermission
  };
}
