import { prisma } from "../../core/database/prisma.js"; import { ApiError } from "../../core/http/api-error.js"; import { auditService } from "../audit/audit.service.js"; import { AuditAction } from "../audit/audit.constants.js"; import { superAdminBootstrapService } from "./bootstrap/super-admin-bootstrap.service.js"; import { identityService } from "./identities/identity.service.js"; import { deviceService } from "./sessions/device.service.js"; import { sessionService } from "./sessions/session.service.js"; import { permissionService } from "../users/rbac/permission.service.js"; import type { RequestInfo,StrategyResult } from "./auth.types.js";
export const authService = {
  async complete(result: StrategyResult, info: RequestInfo = {}) {
    const user = await identityService.resolve(result);
    if (user.status !== "ACTIVE") {
      throw new ApiError(403, "ACCOUNT_BLOCKED", "Tài khoản của bạn đã bị khóa hoặc không khả dụng");
    }
    await superAdminBootstrapService.bootstrapIfEligible(user.id, result);

    const [roles, credential, permissions] = await Promise.all([
      prisma.userRole.findMany({
        where: { userId: user.id },
        include: { role: true },
        orderBy: { role: { rank: "desc" } }
      }),
      prisma.passwordCredential.findUnique({
        where: { userId: user.id },
        select: { mustChangePassword: true }
      }),
      permissionService.resolve(user.id)
    ]);

    const device = await deviceService.resolve(user.id, info.fingerprint, info.userAgent);
    const tokens = await sessionService.create({
      userId: user.id,
      deviceId: device.id,
      ipAddress: info.ipAddress,
      userAgent: info.userAgent
    });

    await auditService.record({
      actorUserId: user.id,
      action: AuditAction.LOGIN_SUCCESS,
      entityType: "Session",
      entityId: tokens.session.id,
      ipAddress: info.ipAddress,
      userAgent: info.userAgent
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        mustChangePassword: Boolean(credential?.mustChangePassword),
        roles: roles.map(({ role }) => ({ name: role.name, rank: role.rank })),
        permissions: Array.from(permissions)
      },
      ...tokens
    };
  }
};
