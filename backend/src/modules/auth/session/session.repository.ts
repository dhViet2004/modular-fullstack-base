import { prisma } from "../../../core/database/prisma.js";

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

// Ghi một session mới và refresh token hash vào database.
export function createSession(data: CreateSessionData) {
  return prisma.session.create({
    data,
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

// Đánh dấu session đã bị thu hồi nếu session và refresh token hash vẫn khớp.
export function revokeSession(data: RevokeSessionData) {
  return prisma.session.updateMany({
    where: {
      id: data.sessionId,
      refreshTokenHash: data.refreshTokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: data.revokedAt,
    },
  });
}
