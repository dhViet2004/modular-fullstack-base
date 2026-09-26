import { randomUUID } from "node:crypto";

import { env } from "../../../config/env.js";
import { ApplicationError } from "../../../core/http/application-error.js";
import {
  AUDIT_ACTIONS,
  AUDIT_OUTCOMES,
  AUDIT_SUBJECT_TYPES,
} from "../../audit/audit.catalog.js";
import {
  normalizeAuditRequestContext,
  type AuditRequestContext,
} from "../../audit/audit.service.js";
import { signAccessToken, verifyAccessToken } from "./access-token.js";
import {
  generateRefreshToken,
  parseRefreshToken,
  verifyRefreshTokenSecret,
} from "./refresh-token.js";
import {
  createSessionWithAudit,
  findSessionById,
  revokeSessionWithAudit,
  rotateSessionRefreshToken,
} from "./session.repository.js";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export type CreatedAuthSession = {
  accessToken: string;
  accessTokenExpiresInSeconds: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};

// Tạo lỗi 401 thống nhất khi refresh token không hợp lệ hoặc không còn hiệu lực.
function invalidRefreshTokenError() {
  return new ApplicationError(
    401,
    "INVALID_REFRESH_TOKEN",
    "Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
  );
}

// Tạo lỗi 401 thống nhất khi access token thiếu, sai hoặc session không còn hợp lệ.
function unauthenticatedError() {
  return new ApplicationError(
    401,
    "UNAUTHENTICATED",
    "Bạn cần đăng nhập để tiếp tục",
  );
}

// Tính thời điểm refresh token hết hạn dựa trên số ngày trong biến môi trường.
function createRefreshTokenExpiresAt(now: Date): Date {
  return new Date(
    now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * MILLISECONDS_PER_DAY,
  );
}

// Tạo session mới, access token và refresh token sau khi đăng nhập thành công.
export async function createAuthSession(
  userId: string,
  context: AuditRequestContext,
): Promise<CreatedAuthSession> {
  // UUID được tạo trong service để refresh token có thể chứa sessionId trước khi ghi DB.
  const sessionId = randomUUID();
  const refreshToken = generateRefreshToken(sessionId);
  const refreshTokenExpiresAt = createRefreshTokenExpiresAt(new Date());
  const auditContext = normalizeAuditRequestContext(context);
  const accessToken = await signAccessToken({
    userId,
    sessionId,
  });

  await createSessionWithAudit(
    {
      id: sessionId,
      userId,
      refreshTokenHash: refreshToken.tokenHash,
      expiresAt: refreshTokenExpiresAt,
    },
    {
      action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCEEDED,
      outcome: AUDIT_OUTCOMES.SUCCESS,
      actorUserId: userId,
      subjectType: AUDIT_SUBJECT_TYPES.SESSION,
      subjectId: sessionId,
      sessionId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    },
  );

  return {
    accessToken,
    accessTokenExpiresInSeconds: env.JWT_ACCESS_TTL_SECONDS,
    refreshToken: refreshToken.token,
    refreshTokenExpiresAt,
  };
}

// Kiểm tra refresh token cũ, thay hash trong database và phát cặp token mới.
export async function refreshAuthSession(
  token: string,
): Promise<CreatedAuthSession> {
  const parsedToken = parseRefreshToken(token);

  // TypeScript hiểu parsedToken không còn là null sau điều kiện này.
  if (!parsedToken) {
    throw invalidRefreshTokenError();
  }

  const session = await findSessionById(parsedToken.sessionId);
  const now = new Date();

  // Chỉ cần một điều kiện sai là toàn bộ refresh request bị từ chối.
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= now ||
    session.user.status !== "ACTIVE" ||
    !verifyRefreshTokenSecret(parsedToken.secret, session.refreshTokenHash)
  ) {
    throw invalidRefreshTokenError();
  }

  const nextRefreshToken = generateRefreshToken(session.id);
  const refreshTokenExpiresAt = createRefreshTokenExpiresAt(now);
  const accessToken = await signAccessToken({
    userId: session.userId,
    sessionId: session.id,
  });

  // Conditional update đảm bảo chỉ một request được quyền sử dụng token cũ.
  const rotationResult = await rotateSessionRefreshToken({
    sessionId: session.id,
    currentRefreshTokenHash: session.refreshTokenHash,
    newRefreshTokenHash: nextRefreshToken.tokenHash,
    expiresAt: refreshTokenExpiresAt,
    now,
  });

  // `!==` là so sánh khác nhau nghiêm ngặt, không tự chuyển đổi kiểu dữ liệu.
  if (rotationResult.count !== 1) {
    throw invalidRefreshTokenError();
  }

  return {
    accessToken,
    accessTokenExpiresInSeconds: env.JWT_ACCESS_TTL_SECONDS,
    refreshToken: nextRefreshToken.token,
    refreshTokenExpiresAt,
  };
}

// Thu hồi session tương ứng với refresh token; token sai được bỏ qua để logout có tính idempotent.
export async function revokeAuthSession(
  token: string,
  context: AuditRequestContext,
): Promise<void> {
  const parsedToken = parseRefreshToken(token);

  if (!parsedToken) {
    return;
  }

  const session = await findSessionById(parsedToken.sessionId);

  if (
    !session ||
    session.revokedAt ||
    !verifyRefreshTokenSecret(parsedToken.secret, session.refreshTokenHash)
  ) {
    return;
  }

  const auditContext = normalizeAuditRequestContext(context);

  await revokeSessionWithAudit(
    {
      sessionId: session.id,
      refreshTokenHash: session.refreshTokenHash,
      revokedAt: new Date(),
    },
    {
      action: AUDIT_ACTIONS.AUTH_LOGOUT_SUCCEEDED,
      outcome: AUDIT_OUTCOMES.SUCCESS,
      actorUserId: session.userId,
      subjectType: AUDIT_SUBJECT_TYPES.SESSION,
      subjectId: session.id,
      sessionId: session.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    },
  );
}

// Xác minh access token và kiểm tra session/user vẫn còn hiệu lực trong database.
export async function authenticateAccessToken(token: string) {
  try {
    const claims = await verifyAccessToken(token);
    const session = await findSessionById(claims.sessionId);
    const now = new Date();

    if (
      !session ||
      session.userId !== claims.userId ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.status !== "ACTIVE"
    ) {
      throw unauthenticatedError();
    }

    return {
      sessionId: session.id,
      user: session.user,
    };
  } catch (error: unknown) {
    // Giữ nguyên ApplicationError do chính service tạo; lỗi JOSE được đổi thành lỗi 401 chung.
    if (error instanceof ApplicationError) {
      throw error;
    }

    throw unauthenticatedError();
  }
}
