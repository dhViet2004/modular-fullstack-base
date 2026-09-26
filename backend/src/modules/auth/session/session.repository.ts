import { prisma } from "../../../core/database/prisma.js";
import type { CreateAuditLogData } from "../../audit/audit.repository.js";

export type CreateSessionData = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
};

export type RotateSessionRefreshTokenData = {
  sessionId: string;
  currentRefreshTokenHash: string;
  newRefreshTokenHash: string;
  expiresAt: Date;
  now: Date;
};

export type RevokeSessionData = {
  sessionId: string;
  refreshTokenHash: string;
  revokedAt: Date;
};

// Tạo session và audit event trong cùng transaction để không commit lệch nhau.
export function createSessionWithAudit(
  data: CreateSessionData,
  audit: CreateAuditLogData,
  limit = 5,
) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT 1 FROM "User" WHERE id = ${data.userId}::uuid FOR UPDATE`;
    const active = await transaction.session.findMany({
      where: {
        userId: data.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    const stale = active.slice(0, Math.max(0, active.length - limit + 1));
    if (stale.length) {
      await transaction.session.updateMany({
        where: { id: { in: stale.map((session) => session.id) } },
        data: { revokedAt: new Date() },
      });
    }
    const session = await transaction.session.create({ data });
    await transaction.auditLog.create({ data: audit });
    return session;
  });
}

export function listActiveSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export function revokeOwnedSession(userId: string, sessionId: string) {
  return prisma.session.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// Tìm session theo khóa chính và nạp kèm user phục vụ kiểm tra trạng thái tài khoản.
export function findSessionById(sessionId: string) {
  return prisma.session.findUnique({
    where: {
      id: sessionId,
    },
    include: {
      user: true,
    },
  });
}

// Đổi refresh token hash nếu session vẫn hợp lệ và hash cũ chưa bị request khác thay.
export function rotateSessionRefreshToken(data: RotateSessionRefreshTokenData) {
  // `updateMany` trả count và cho phép đặt nhiều điều kiện để chống race condition.
  return prisma.session.updateMany({
    where: {
      id: data.sessionId,
      refreshTokenHash: data.currentRefreshTokenHash,
      revokedAt: null,
      expiresAt: {
        // `gt` nghĩa là greater than: expiresAt phải lớn hơn thời điểm hiện tại.
        gt: data.now,
      },
    },
    data: {
      refreshTokenHash: data.newRefreshTokenHash,
      expiresAt: data.expiresAt,
    },
  });
}

// Chỉ ghi logout audit khi conditional update thực sự thu hồi được session.
export function revokeSessionWithAudit(
  data: RevokeSessionData,
  audit: CreateAuditLogData,
) {
  return prisma.$transaction(async (transaction) => {
    const result = await transaction.session.updateMany({
      where: {
        id: data.sessionId,
        refreshTokenHash: data.refreshTokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: data.revokedAt,
      },
    });

    if (result.count === 1) {
      await transaction.auditLog.create({ data: audit });
    }

    return result;
  });
}
