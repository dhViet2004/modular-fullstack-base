export const PERMISSIONS = {
  USERS_READ: "users:read",
  AUDIT_READ: "audit:read",
  ROLES_MANAGE: "roles:manage",
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
    ...(isSuperAdmin
      ? [
          {
            href: "/super-admin?tab=email-verification",
            label: "Xác thực email",
          },
          { href: "/super-admin?tab=rbac", label: "Vai trò và quyền" },
        ]
      : []),
    { href: "/account", label: "Tài khoản của tôi" },
    { href: "/account/files", label: "Tệp của tôi" },
  ];
}

export function canReadAuditLogs(permissions: string[]) {
  return permissions.includes(PERMISSIONS.AUDIT_READ);
}
