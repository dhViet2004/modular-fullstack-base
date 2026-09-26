export const PERMISSIONS = {
  USERS_READ: "users:read",
  AUDIT_READ: "audit:read",
} as const;

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

export function getRoleFlags(roles: string[]) {
  return {
    isSuperAdmin: roles.includes(ROLES.SUPER_ADMIN),
    isAdmin: roles.includes(ROLES.ADMIN),
    isMember: roles.includes(ROLES.MEMBER),
  };
}

export function getNavigationItems(roles: string[], permissions: string[]) {
  const { isSuperAdmin, isAdmin } = getRoleFlags(roles);
  return [
    ...(isSuperAdmin
      ? [{ href: "/super-admin", label: "Super admin" }]
      : isAdmin
        ? [{ href: "/admin", label: "Admin" }]
        : []),
    ...(permissions.includes(PERMISSIONS.USERS_READ)
      ? [{ href: "/admin/users", label: "Người dùng" }]
      : []),
    ...(permissions.includes(PERMISSIONS.AUDIT_READ)
      ? [{ href: "/admin/audit-logs", label: "Audit log" }]
      : []),
    { href: "/account/files", label: "Quản lý file" },
    { href: "/account", label: "Tài khoản" },
  ];
}

export function canReadAuditLogs(permissions: string[]) {
  return permissions.includes(PERMISSIONS.AUDIT_READ);
}
