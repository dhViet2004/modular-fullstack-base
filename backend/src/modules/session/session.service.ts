import { randomUUID } from "node:crypto";
import type { User } from "@prisma/client";
import type { CreateAuditLogData } from "../audit/audit.repository.js";

import { env } from "../../config/env.js";
import { prisma } from "../../core/database/prisma.js";
import { ApplicationError } from "../../core/http/application-error.js";
import { getUserAccessContext } from "../access/access.service.js";
import {
  createRefreshToken,
  matchesRefreshSecret,
  parseRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from "./session.tokens.js";
import {
  AUDIT_ACTIONS,
  AUDIT_OUTCOMES,
  AUDIT_SUBJECT_TYPES,
  type AuditAction,
} from "../audit/audit.catalog.js";
import {
  normalizeAuditRequestContext,
  type AuditRequestContext,
} from "../audit/audit.service.js";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const REFRESH_GRACE_MS = 30_000;

export type CreatedAuthSession = {
  accessToken: string;
  accessTokenExpiresInSeconds: number;
  refreshToken: string | null;
  refreshTokenExpiresAt: Date;
};
function invalidRefreshTokenError() {
  return new ApplicationError(
    401,
    "INVALID_REFRESH_TOKEN",
    "Phiên ??ng nhập không hợp lệ hoặc đã hết hạn",
  );
}
function unauthenticatedError() {
  return new ApplicationError(
    401,
    "UNAUTHENTICATED",
    "Bạn cần đăng nhập để tiếp tục",
  );
}
function createRefreshTokenExpiresAt(now: Date): Date {
  return new Date(
    now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * MILLISECONDS_PER_DAY,
  );
}
export async function createAuthSession(
  userId: string,
  context: AuditRequestContext,
  auditAction: AuditAction = AUDIT_ACTIONS.AUTH_LOGIN_SUCCEEDED,
): Promise<CreatedAuthSession> {
  const sessionId = randomUUID();
  const refreshToken = createRefreshToken(sessionId);
  const refreshTokenExpiresAt = createRefreshTokenExpiresAt(new Date());
  const auditContext = normalizeAuditRequestContext(context);
  const accessToken = await signAccessToken(userId, sessionId);

  await createSessionWithAudit(
    {
      id: sessionId,
      userId,
      refreshTokenHash: refreshToken.secretHash,
      expiresAt: refreshTokenExpiresAt,
    },
    {
      action: auditAction,
      outcome: AUDIT_OUTCOMES.SUCCESS,
      actorUserId: userId,
      subjectType: AUDIT_SUBJECT_TYPES.SESSION,
      subjectId: sessionId,
      sessionId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    },
    env.MAX_ACTIVE_SESSIONS_PER_USER,
  );

  return {
    accessToken,
    accessTokenExpiresInSeconds: env.JWT_ACCESS_TTL_SECONDS,
    refreshToken: refreshToken.token,
    refreshTokenExpiresAt,
  };
}

export async function getActiveSessions(
  userId: string,
  currentSessionId: string,
) {
  const sessions = await prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: "desc" },
  });
  return sessions.map((session) => ({
    ...session,
    current: session.id === currentSessionId,
  }));
}

export async function revokeUserSession(userId: string, sessionId: string) {
  await prisma.session.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
export async function refreshAuthSession(
  token: string,
): Promise<CreatedAuthSession> {
  const parsedToken = parseRefreshToken(token);
  if (!parsedToken) {
    throw invalidRefreshTokenError();
  }

  const session = await prisma.session.findUnique({
    where: { id: parsedToken.sessionId },
    include: { user: true },
  });
  const now = new Date();
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= now ||
    session.user.status !== "ACTIVE" ||
    (!matchesRefreshSecret(parsedToken.secret, session.refreshTokenHash) &&
      !matchesRefreshSecret(
        parsedToken.secret,
        session.previousRefreshTokenHash ?? "",
      ))
  ) {
    throw invalidRefreshTokenError();
  }

  const accessToken = await signAccessToken(session.userId, session.id);
  if (matchesRefreshSecret(parsedToken.secret, session.refreshTokenHash)) {
    const nextRefreshToken = createRefreshToken(session.id);
    const refreshTokenExpiresAt = createRefreshTokenExpiresAt(now);
    const rotationResult = await prisma.session.updateMany({
      where: {
        id: session.id,
        refreshTokenHash: session.refreshTokenHash,
        revokedAt: null,
      },
      data: {
        refreshTokenHash: nextRefreshToken.secretHash,
        previousRefreshTokenHash: session.refreshTokenHash,
        lastUsedAt: now,
        expiresAt: refreshTokenExpiresAt,
      },
    });
    if (rotationResult.count !== 1) throw invalidRefreshTokenError();

    return {
      accessToken,
      accessTokenExpiresInSeconds: env.JWT_ACCESS_TTL_SECONDS,
      refreshToken: nextRefreshToken.token,
      refreshTokenExpiresAt,
    };
  }

  if (
    matchesRefreshSecret(
      parsedToken.secret,
      session.previousRefreshTokenHash ?? "",
    ) &&
    now.getTime() - session.lastUsedAt.getTime() <= REFRESH_GRACE_MS
  ) {
    return {
      accessToken,
      accessTokenExpiresInSeconds: env.JWT_ACCESS_TTL_SECONDS,
      refreshToken: null,
      refreshTokenExpiresAt: session.expiresAt,
    };
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: now },
  });
  throw new ApplicationError(
    401,
    "REFRESH_TOKEN_REUSED",
    "Refresh token đã bị sử dụng lại, phiên đã bị thu hồi",
  );
}
export async function revokeAuthSession(
  token: string,
  context: AuditRequestContext,
): Promise<void> {
  const parsedToken = parseRefreshToken(token);

  if (!parsedToken) {
    return;
  }

  const session = await prisma.session.findUnique({
    where: { id: parsedToken.sessionId },
    include: { user: true },
  });

  if (
    !session ||
    session.revokedAt ||
    (!matchesRefreshSecret(parsedToken.secret, session.refreshTokenHash) &&
      !matchesRefreshSecret(
        parsedToken.secret,
        session.previousRefreshTokenHash ?? "",
      ))
  ) {
    return;
  }

  const auditContext = normalizeAuditRequestContext(context);

  await prisma.$transaction(async (transaction) => {
    const result = await transaction.session.updateMany({
      where: {
        id: session.id,
        OR: [
          { refreshTokenHash: session.refreshTokenHash },
          ...(session.previousRefreshTokenHash
            ? [{ previousRefreshTokenHash: session.previousRefreshTokenHash }]
            : []),
        ],
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    if (result.count === 1) {
      await transaction.auditLog.create({
        data: {
          action: AUDIT_ACTIONS.AUTH_LOGOUT_SUCCEEDED,
          outcome: AUDIT_OUTCOMES.SUCCESS,
          actorUserId: session.userId,
          subjectType: AUDIT_SUBJECT_TYPES.SESSION,
          subjectId: session.id,
          sessionId: session.id,
          ipAddress: auditContext.ipAddress,
          userAgent: auditContext.userAgent,
        },
      });
    }
  });
}
export async function authenticateAccessToken(
  token: string,
): Promise<{ sessionId: string; user: Pick<User, "id"> & Partial<User> }> {
  try {
    const claims = await verifyAccessToken(token);
    return {
      sessionId: claims.sessionId,
      user: { id: claims.userId },
    };
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      throw error;
    }

    throw unauthenticatedError();
  }
}

async function getCurrentUserWithAccess(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { passwordCredential: { select: { userId: true } } },
  });
  if (!user || user.status !== "ACTIVE") throw unauthenticatedError();
  const { passwordCredential, ...publicUser } = user;
  return {
    user: { ...publicUser, hasPassword: Boolean(passwordCredential) },
    access: await getUserAccessContext(user.id),
  };
}
export const sessionService = {
  create: createAuthSession,
  refresh: refreshAuthSession,
  logout: revokeAuthSession,
  list: getActiveSessions,
  revoke: revokeUserSession,
  me: getCurrentUserWithAccess,
};

type SessionData = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
};

function createSessionWithAudit(
  data: SessionData,
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
