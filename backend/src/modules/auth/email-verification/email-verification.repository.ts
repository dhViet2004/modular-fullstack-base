import { Prisma } from "@prisma/client";

import { prisma } from "../../../core/database/prisma.js";
import type { CreateAuditLogData } from "../../audit/audit.repository.js";

export type CreateEmailVerificationTokenData = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  cooldownStartedAt: Date;
};

export type CreateEmailVerificationTokenResult =
  | { status: "created"; tokenId: string; email: string }
  | { status: "already-verified" }
  | { status: "rate-limited" }
  | { status: "user-not-found" };

const verifiedUserSelect = {
  id: true,
  email: true,
  displayName: true,
  status: true,
  emailVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

// Chạy transaction Serializable và thử lại khi PostgreSQL phát hiện xung đột đồng thời.
async function runSerializable<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await operation();
    } catch (error: unknown) {
      const canRetry =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 3;

      if (!canRetry) throw error;
    }
  }

  throw new Error("Unreachable serializable transaction state");
}

// Kiểm tra user/cooldown, vô hiệu token cũ và tạo token mới trong cùng transaction.
export function createEmailVerificationToken(
  data: CreateEmailVerificationTokenData,
): Promise<CreateEmailVerificationTokenResult> {
  return runSerializable(() =>
    prisma.$transaction(
      async (transaction) => {
        const user = await transaction.user.findUnique({
          where: { id: data.userId },
          select: { email: true, emailVerifiedAt: true },
        });

        if (!user) return { status: "user-not-found" };
        if (user.emailVerifiedAt) return { status: "already-verified" };

        const latestToken = await transaction.emailVerificationToken.findFirst({
          where: { userId: data.userId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });

        if (latestToken && latestToken.createdAt > data.cooldownStartedAt) {
          return { status: "rate-limited" };
        }

        await transaction.emailVerificationToken.deleteMany({
          where: { userId: data.userId, consumedAt: null },
        });

        const token = await transaction.emailVerificationToken.create({
          data: {
            userId: data.userId,
            tokenHash: data.tokenHash,
            expiresAt: data.expiresAt,
          },
          select: { id: true },
        });

        return { status: "created", tokenId: token.id, email: user.email };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
}

// Xóa đúng token vừa tạo để bù trừ khi mail delivery thất bại.
export function deleteEmailVerificationToken(tokenId: string) {
  return prisma.emailVerificationToken.deleteMany({ where: { id: tokenId } });
}

// Consume token và xác minh user nguyên tử; count = 0 nghĩa là token không còn hợp lệ.
export function consumeEmailVerificationToken(
  tokenHash: string,
  now: Date,
  audit: Omit<CreateAuditLogData, "actorUserId" | "subjectId">,
) {
  return prisma.$transaction(async (transaction) => {
    const token = await transaction.emailVerificationToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true },
    });

    if (!token) return null;

    const consumed = await transaction.emailVerificationToken.updateMany({
      where: {
        id: token.id,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });

    if (consumed.count !== 1) return null;

    const user = await transaction.user.update({
      where: { id: token.userId },
      data: { emailVerifiedAt: now },
      select: verifiedUserSelect,
    });

    await transaction.auditLog.create({
      data: {
        ...audit,
        actorUserId: token.userId,
        subjectId: token.userId,
      },
    });

    return user;
  });
}
