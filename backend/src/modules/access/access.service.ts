import { ApplicationError } from "../../core/http/application-error.js";
import {
  findAccessContextByUserId,
  userHasRole,
  userHasPermission,
} from "./access.repository.js";
import { ROLE_CODES } from "./permission.catalog.js";
import type { PermissionCode, RoleCode } from "./permission.catalog.js";

export type AccessContext = {
  roles: RoleCode[];
  permissions: PermissionCode[];
};

// Từ chối request bằng 403 khi user đã đăng nhập nhưng thiếu permission yêu cầu.
export async function assertUserHasPermission(
  userId: string,
  permission: PermissionCode,
): Promise<void> {
  if (!(await userHasPermission(userId, permission))) {
    throw new ApplicationError(
      403,
      "FORBIDDEN",
      "Bạn không có quyền thực hiện thao tác này",
    );
  }
}

export async function assertUserIsSuperAdmin(userId: string) {
  if (!(await userHasRole(userId, ROLE_CODES.SUPER_ADMIN))) {
    throw new ApplicationError(
      403,
      "FORBIDDEN",
      "Chỉ SUPER_ADMIN được quản lý role",
    );
  }
}

// Làm phẳng role graph từ Prisma thành hai mảng không trùng cho API/frontend sử dụng.
export async function getUserAccessContext(
  userId: string,
): Promise<AccessContext> {
  const assignments = await findAccessContextByUserId(userId);
  const roles = new Set<RoleCode>();
  const permissions = new Set<PermissionCode>();

  for (const assignment of assignments) {
    roles.add(assignment.role.code as RoleCode);

    for (const rolePermission of assignment.role.permissions) {
      permissions.add(rolePermission.permission.code as PermissionCode);
    }
  }

  return {
    roles: [...roles].sort(),
    permissions: [...permissions].sort(),
  };
}
