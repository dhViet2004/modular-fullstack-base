import { prisma } from "../../../core/database/prisma.js";
import { logger } from "../../../core/logger/logger.js";

export interface AuditCleanupPayload {
  retentionDays?: number;
}

export interface InactiveUsersPayload {
  inactiveDays?: number;
  targetStatus?: "SUSPENDED" | "BLOCKED";
}

/**
 * Tác vụ định kỳ: Dọn dẹp nhật ký kiểm toán cũ hơn số ngày chỉ định
 */
export async function cleanupAuditLogsJob(payload: AuditCleanupPayload = {}) {
  const retentionDays = payload.retentionDays && payload.retentionDays > 0 ? payload.retentionDays : 90;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const result = await prisma.auditLog.deleteMany({
    where: {
      createdAt: { lt: cutoff }
    }
  });

  logger.info(`[Job:cleanupAuditLogs] Đã xóa ${result.count} bản ghi nhật ký kiểm toán cũ hơn ${retentionDays} ngày.`);
  return { deleted: result.count, cutoff };
}

/**
 * Tác vụ định kỳ: Quét và cập nhật trạng thái người dùng không hoạt động
 */
export async function updateInactiveUsersJob(payload: InactiveUsersPayload = {}) {
  const inactiveDays = payload.inactiveDays && payload.inactiveDays > 0 ? payload.inactiveDays : 180;
  const targetStatus = payload.targetStatus || "SUSPENDED";
  const cutoff = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);

  // Tìm các user có status ACTIVE nhưng không có session hoạt động gần đây
  const inactiveUsers = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      sessions: {
        none: {
          lastActiveAt: { gte: cutoff }
        }
      },
      createdAt: { lt: cutoff }
    },
    select: { id: true, email: true }
  });

  if (inactiveUsers.length === 0) {
    logger.info(`[Job:updateInactiveUsers] Không có người dùng nào không hoạt động quá ${inactiveDays} ngày.`);
    return { updated: 0 };
  }

  const ids = inactiveUsers.map((u) => u.id);
  const updated = await prisma.user.updateMany({
    where: { id: { in: ids } },
    data: { status: targetStatus }
  });

  logger.info(`[Job:updateInactiveUsers] Đã cập nhật ${updated.count} người dùng sang trạng thái ${targetStatus}.`);
  return { updated: updated.count, affectedUserIds: ids };
}
