export const PERMISSIONS = {
  PROFILE_READ_SELF: "profile:read:self",
  PROFILE_UPDATE_SELF: "profile:update:self",
  USERS_READ: "users:read",
  USERS_UPDATE: "users:update",
  USERS_SUSPEND: "users:suspend",
  ROLES_MANAGE: "roles:manage",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_CODES = {
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

export const ROLE_PERMISSIONS: Record<RoleCode, readonly PermissionCode[]> = {
  ADMIN: Object.values(PERMISSIONS),
  MEMBER: [PERMISSIONS.PROFILE_READ_SELF, PERMISSIONS.PROFILE_UPDATE_SELF],
};
