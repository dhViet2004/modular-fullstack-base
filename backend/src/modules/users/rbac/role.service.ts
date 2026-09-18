import { prisma } from "../../../core/database/prisma.js";
import { ApiError } from "../../../core/http/api-error.js";
import { auditService } from "../../audit/audit.service.js";
import { AuditAction } from "../../audit/audit.constants.js";
import { userRepository } from "../user.repository.js";

const SYSTEM_ROLES = ["SUPER_ADMIN", "ADMIN", "MEMBER"];

export const roleService = {
  list: () =>
    prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true }
        },
        _count: {
          select: { users: true }
        }
      },
      orderBy: { rank: "desc" }
    }),

  assign: (userId: string, roleId: string) =>
    prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: {},
      create: { userId, roleId }
    }),

  remove: (userId: string, roleId: string) =>
    prisma.userRole.deleteMany({
      where: { userId, roleId }
    }),

  async create(actorId: string, name: string, rank: number, permissionIds: string[] = []) {
    const actorRank = await userRepository.maxRank(actorId);
    if (rank >= actorRank) {
      throw new ApiError(403, "INSUFFICIENT_ROLE_RANK", "Không thể tạo vai trò có cấp bậc ngang hoặc cao hơn cấp bậc của bạn");
    }

    if (name === "SUPER_ADMIN" || rank >= 100) {
      throw new ApiError(403, "FORBIDDEN", "Hệ thống chỉ cho phép duy nhất 1 Super Admin và không thể tạo thêm vai trò cấp 100");
    }

    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) {
      throw new ApiError(409, "ROLE_EXISTS", `Vai trò "${name}" đã tồn tại trên hệ thống`);
    }

    const role = await prisma.role.create({
      data: {
        name,
        rank,
        permissions: {
          create: permissionIds.map((permissionId) => ({
            permissionId
          }))
        }
      },
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    });

    await auditService.record({
      actorUserId: actorId,
      action: AuditAction.ROLE_CREATED,
      entityType: "Role",
      entityId: role.id,
      metadata: { name, rank, permissionCount: permissionIds.length }
    });

    return role;
  },

  async updatePermissions(actorId: string, roleId: string, permissionIds: string[]) {
    const [actorRank, role] = await Promise.all([
      userRepository.maxRank(actorId),
      prisma.role.findUnique({ where: { id: roleId } })
    ]);

    if (!role) {
      throw new ApiError(404, "ROLE_NOT_FOUND", "Không tìm thấy vai trò");
    }

    if (role.rank >= actorRank) {
      throw new ApiError(403, "INSUFFICIENT_ROLE_RANK", "Không thể chỉnh sửa quyền của vai trò có cấp bậc ngang hoặc cao hơn cấp bậc của bạn");
    }

    // Cập nhật permissions trong transaction
    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId }
      });

      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId,
            permissionId
          }))
        });
      }
    });

    await auditService.record({
      actorUserId: actorId,
      action: AuditAction.ROLE_PERMISSIONS_UPDATED,
      entityType: "Role",
      entityId: roleId,
      metadata: { roleName: role.name, permissionCount: permissionIds.length }
    });

    return prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    });
  },

  async delete(actorId: string, roleId: string) {
    const [actorRank, role] = await Promise.all([
      userRepository.maxRank(actorId),
      prisma.role.findUnique({ where: { id: roleId } })
    ]);

    if (!role) {
      throw new ApiError(404, "ROLE_NOT_FOUND", "Không tìm thấy vai trò");
    }

    if (SYSTEM_ROLES.includes(role.name)) {
      throw new ApiError(400, "CANNOT_DELETE_SYSTEM_ROLE", `Không thể xóa vai trò hệ thống cốt lõi (${role.name})`);
    }

    if (role.rank >= actorRank) {
      throw new ApiError(403, "INSUFFICIENT_ROLE_RANK", "Không thể xóa vai trò có cấp bậc ngang hoặc cao hơn cấp bậc của bạn");
    }

    await prisma.role.delete({
      where: { id: roleId }
    });

    await auditService.record({
      actorUserId: actorId,
      action: AuditAction.ROLE_DELETED,
      entityType: "Role",
      entityId: roleId,
      metadata: { roleName: role.name }
    });

    return { success: true };
  }
};
