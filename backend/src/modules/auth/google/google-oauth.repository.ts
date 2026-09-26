import { Prisma } from "@prisma/client";

import { prisma } from "../../../core/database/prisma.js";
import { ROLE_CODES } from "../../access/permission.catalog.js";
import type { GoogleIdentity } from "./google-oauth-client.js";

export type CreateGoogleOAuthAttemptData = {
  stateHash: string;
  codeVerifier: string;
  expiresAt: Date;
};

const googleUserSelect = {
  id: true,
  email: true,
  displayName: true,
  status: true,
  emailVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

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

// Lưu attempt ngắn hạn; raw state không đi vào database.
export function createGoogleOAuthAttempt(data: CreateGoogleOAuthAttemptData) {
  return prisma.googleOAuthAttempt.create({ data, select: { id: true } });
}

// Consume state bằng conditional update để hai callback không thể dùng cùng attempt.
export function consumeGoogleOAuthAttempt(stateHash: string, now: Date) {
  return prisma.$transaction(async (transaction) => {
    const attempt = await transaction.googleOAuthAttempt.findUnique({
      where: { stateHash },
      select: { id: true, codeVerifier: true },
    });

    if (!attempt) return null;

    const consumed = await transaction.googleOAuthAttempt.updateMany({
      where: {
        id: attempt.id,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });

    return consumed.count === 1 ? attempt.codeVerifier : null;
  });
}

// Tìm identity theo Google sub, hoặc liên kết/tạo user theo verified email nguyên tử.
export function resolveGoogleUser(identity: GoogleIdentity, verifiedAt: Date) {
  return runSerializable(() =>
    prisma.$transaction(
      async (transaction) => {
        const linkedAccount = await transaction.googleAccount.findUnique({
          where: { googleSubject: identity.googleSubject },
          select: { user: { select: googleUserSelect } },
        });

        if (linkedAccount) return linkedAccount.user;

        const existingUser = await transaction.user.findUnique({
          where: { email: identity.email },
          select: {
            id: true,
            emailVerifiedAt: true,
            googleAccount: { select: { id: true } },
          },
        });

        if (existingUser) {
          if (existingUser.googleAccount) {
            throw new Error("User already has another Google account");
          }

          return transaction.user.update({
            where: { id: existingUser.id },
            data: {
              emailVerifiedAt: existingUser.emailVerifiedAt ?? verifiedAt,
              googleAccount: {
                create: { googleSubject: identity.googleSubject },
              },
            },
            select: googleUserSelect,
          });
        }

        return transaction.user.create({
          data: {
            email: identity.email,
            displayName: identity.displayName,
            emailVerifiedAt: verifiedAt,
            googleAccount: {
              create: { googleSubject: identity.googleSubject },
            },
            roles: {
              create: { role: { connect: { code: ROLE_CODES.MEMBER } } },
            },
          },
          select: googleUserSelect,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
}
