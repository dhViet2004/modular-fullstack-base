import crypto from "node:crypto";
import { prisma } from "../../core/database/prisma.js";
import { ApiError } from "../../core/http/api-error.js";
import { userRepository } from "./user.repository.js";
import { rbacPolicy } from "./rbac/rbac.policy.js";
import { roleService } from "./rbac/role.service.js";
import { permissionService } from "./rbac/permission.service.js";
import { sessionRepository } from "../auth/sessions/session.repository.js";
import { auditService } from "../audit/audit.service.js";
import { AuditAction } from "../audit/audit.constants.js";
import { jobProducer } from "../jobs/producers/job.producer.js";
import { hashPassword } from "../../core/security/password.js";

export const userService = {
  async list(page = 1, limit = 20) {
    return {
      items: await userRepository.list((page - 1) * limit, limit),
      total: await userRepository.count(),
      page,
      limit
    };
  },

  detail: async (id: string) => userRepository.detail(id),
  update: userRepository.update,

  async setBlocked(actorId: string, targetId: string, blocked: boolean) {
    const [actorRank, targetRank] = await Promise.all([
      userRepository.maxRank(actorId),
      userRepository.maxRank(targetId)
    ]);
    rbacPolicy.assertCanAct(actorId, actorRank, targetId, targetRank);

    if (blocked && targetRank === 100) {
      const activeSuperAdmins = await prisma.user.count({
        where: {
          status: "ACTIVE",
          roles: { some: { role: { name: "SUPER_ADMIN" } } }
        }
      });
      if (activeSuperAdmins <= 1) {
        throw new ApiError(409, "CONFLICT", "Không thể khóa Super Admin duy nhất của hệ thống");
      }
    }

    const target = await prisma.user.update({
      where: { id: targetId },
      data: { status: blocked ? "BLOCKED" : "ACTIVE" }
    });

    if (blocked) {
      await sessionRepository.revokeAll(targetId);
    }

    await auditService.record({
      actorUserId: actorId,
      action: blocked ? AuditAction.USER_BLOCKED : AuditAction.USER_UNBLOCKED,
      entityType: "User",
      entityId: targetId
    });

    await jobProducer.send("mail.send", {
      kind: "security",
      to: target.email,
      title: blocked ? "Tài khoản bị khóa" : "Tài khoản đã được khôi phục",
      message: blocked ? "Tài khoản của bạn đã bị khóa bởi quản trị viên." : "Tài khoản của bạn đã được mở khóa trở lại.",
      timestamp: new Date().toISOString()
    });
  },

  async role(actorId: string, targetId: string, roleId: string, assign: boolean) {
    const [actorRank, targetRank, role] = await Promise.all([
      userRepository.maxRank(actorId),
      userRepository.maxRank(targetId),
      prisma.role.findUnique({ where: { id: roleId } })
    ]);

    if (!role) {
      throw new ApiError(404, "ROLE_NOT_FOUND", "Không tìm thấy vai trò");
    }

    rbacPolicy.assertCanAct(actorId, actorRank, targetId, targetRank);
    if (assign) {
      rbacPolicy.assertCanAssign(actorRank, role.rank);
    }

    if (assign && role.name === "SUPER_ADMIN") {
      const existingSuperAdmins = await prisma.userRole.count({
        where: {
          role: { name: "SUPER_ADMIN" },
          userId: { not: targetId }
        }
      });
      rbacPolicy.assertSingleSuperAdmin(existingSuperAdmins);
    }

    if (!assign && role.name === "SUPER_ADMIN") {
      const totalSuperAdmins = await prisma.userRole.count({
        where: { role: { name: "SUPER_ADMIN" } }
      });
      if (totalSuperAdmins <= 1) {
        throw new ApiError(409, "CONFLICT", "Không thể gỡ bỏ vai trò Super Admin duy nhất của hệ thống");
      }
    }

    if (assign) {
      await roleService.assign(targetId, roleId);
    } else {
      await roleService.remove(targetId, roleId);
    }

    await auditService.record({
      actorUserId: actorId,
      action: assign ? AuditAction.ROLE_ASSIGNED : AuditAction.ROLE_REMOVED,
      entityType: "User",
      entityId: targetId,
      metadata: { roleId, roleName: role.name }
    });
  },

  async resetUserPassword(actorId: string, targetId: string) {
    const [actorRank, targetRank, target] = await Promise.all([
      userRepository.maxRank(actorId),
      userRepository.maxRank(targetId),
      prisma.user.findUnique({ where: { id: targetId } })
    ]);

    if (!target) {
      throw new ApiError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng");
    }

    rbacPolicy.assertCanAct(actorId, actorRank, targetId, targetRank);

    // Tạo mật khẩu tạm thời 12 ký tự ngẫu nhiên đáp ứng chuẩn bảo mật mạnh
    const randomBytes = crypto.randomBytes(4).toString("hex");
    const tempPassword = `Tmp@${randomBytes}9!`;
    const passwordHash = await hashPassword(tempPassword);
    const temporaryExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 giờ

    await prisma.passwordCredential.upsert({
      where: { userId: targetId },
      create: {
        userId: targetId,
        passwordHash,
        mustChangePassword: true,
        temporaryExpiresAt
      },
      update: {
        passwordHash,
        mustChangePassword: true,
        temporaryExpiresAt,
        passwordChangedAt: new Date()
      }
    });

    // Thu hồi mọi phiên đăng nhập trước đó
    await sessionRepository.revokeAll(targetId);

    await auditService.record({
      actorUserId: actorId,
      action: AuditAction.ADMIN_PASSWORD_RESET,
      entityType: "User",
      entityId: targetId
    });

    await jobProducer.send("mail.send", {
      kind: "security",
      to: target.email,
      title: "Mật khẩu tạm thời cho tài khoản của bạn (Có hiệu lực 24 giờ)",
      message: `Quản trị viên đã cấp lại mật khẩu tạm thời cho tài khoản của bạn:\n\nMật khẩu tạm thời: ${tempPassword}\n\nLưu ý quan trọng:\n- Mật khẩu này chỉ có hiệu lực trong vòng 24 giờ (đến ${temporaryExpiresAt.toLocaleString("vi-VN")}).\n- Khi đăng nhập, hệ thống sẽ yêu cầu bạn đổi mật khẩu mới ngay lập tức để bảo vệ tài khoản.`,
      timestamp: new Date().toISOString()
    });

    return {
      temporaryExpiresAt,
      message: "Mật khẩu tạm thời đã được tạo và gửi tới email người dùng thành công."
    };
  },

  async getPermissions(userId: string) {
    const [user, effectiveSet, allPermissions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: { include: { role: true }, orderBy: { role: { rank: "desc" } } },
          permissionOverrides: { include: { permission: true } }
        }
      }),
      permissionService.resolve(userId),
      prisma.permission.findMany({ orderBy: { name: "asc" } })
    ]);

    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng");
    }

    const maxRank = user.roles.length > 0 ? Math.max(...user.roles.map((r) => r.role.rank)) : 0;

    return {
      roles: user.roles.map((r) => r.role),
      maxRank,
      effectivePermissions: Array.from(effectiveSet),
      overrides: user.permissionOverrides,
      allPermissions
    };
  },

  async overridePermission(actorId: string, targetId: string, permissionId: string, effect: "ALLOW" | "DENY") {
    const [actorRank, targetRank, permission] = await Promise.all([
      userRepository.maxRank(actorId),
      userRepository.maxRank(targetId),
      prisma.permission.findUnique({ where: { id: permissionId } })
    ]);

    if (!permission) {
      throw new ApiError(404, "PERMISSION_NOT_FOUND", "Không tìm thấy quyền");
    }

    rbacPolicy.assertCanAct(actorId, actorRank, targetId, targetRank);

    await prisma.userPermissionOverride.upsert({
      where: {
        userId_permissionId: {
          userId: targetId,
          permissionId
        }
      },
      create: {
        userId: targetId,
        permissionId,
        effect
      },
      update: {
        effect
      }
    });

    await auditService.record({
      actorUserId: actorId,
      action: AuditAction.PERMISSION_OVERRIDDEN,
      entityType: "User",
      entityId: targetId,
      metadata: { permissionId, permissionName: permission.name, effect }
    });

    return { success: true };
  },

  async removePermissionOverride(actorId: string, targetId: string, permissionId: string) {
    const [actorRank, targetRank] = await Promise.all([
      userRepository.maxRank(actorId),
      userRepository.maxRank(targetId)
    ]);

    rbacPolicy.assertCanAct(actorId, actorRank, targetId, targetRank);

    await prisma.userPermissionOverride.deleteMany({
      where: {
        userId: targetId,
        permissionId
      }
    });

    await auditService.record({
      actorUserId: actorId,
      action: AuditAction.PERMISSION_OVERRIDE_REMOVED,
      entityType: "User",
      entityId: targetId,
      metadata: { permissionId }
    });

    return { success: true };
  }
};
