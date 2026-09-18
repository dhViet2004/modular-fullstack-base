export type Permission = {
  id: string;
  name: string;
};

export type RolePermissionItem = {
  permissionId: string;
  roleId: string;
  permission: Permission;
};

export type UserRole = {
  id: string;
  name: string;
  rank: number;
  permissions?: RolePermissionItem[];
  _count?: {
    users: number;
  };
};

export type PermissionOverride = {
  userId: string;
  permissionId: string;
  effect: "ALLOW" | "DENY";
  permission: Permission;
};

export type User = {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string | null;
  status: string;
  roles: { role: UserRole }[];
  permissionOverrides?: PermissionOverride[];
  createdAt?: string;
};

export type UserPermissionsResponse = {
  roles: UserRole[];
  maxRank: number;
  effectivePermissions: string[];
  overrides: PermissionOverride[];
  allPermissions: Permission[];
};
