import { ApiError } from "../../../core/http/api-error.js"; import { RoleRank } from "./role.constants.js";
export const rbacPolicy = {
  assertCanAct(actorId: string, actorRank: number, targetId: string, targetRank: number) {
    if (actorId === targetId) {
      throw new ApiError(403, "FORBIDDEN", "Không thể tự thao tác trên tài khoản của chính mình");
    }
    if (actorRank <= targetRank) {
      throw new ApiError(403, "INSUFFICIENT_ROLE_RANK", "Không thể thao tác trên tài khoản có cấp bậc tương đương hoặc cao hơn");
    }
  },
  assertCanAssign(actorRank: number, roleRank: number) {
    if (roleRank >= RoleRank.SUPER_ADMIN) {
      throw new ApiError(403, "CANNOT_ASSIGN_SUPER_ADMIN", "Hệ thống chỉ cho phép duy nhất 1 Super Admin. Không thể gán vai trò này.");
    }
    if (roleRank > actorRank) {
      throw new ApiError(403, "INSUFFICIENT_ROLE_RANK", "Không thể gán vai trò có cấp bậc cao hơn vai trò của bạn");
    }
  },
  assertSingleSuperAdmin(existingSuperAdminCount: number) {
    if (existingSuperAdminCount > 0) {
      throw new ApiError(409, "SUPER_ADMIN_EXISTS", "Hệ thống chỉ cho phép duy nhất 1 Super Admin. Không thể chỉ định thêm.");
    }
  }
};
