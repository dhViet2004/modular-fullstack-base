import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";

import { env } from "../../../config/env.js";
import { prisma } from "../../../core/database/prisma.js";
import { ApplicationError } from "../../../core/http/application-error.js";
import {
  AUDIT_ACTIONS,
  AUDIT_OUTCOMES,
  AUDIT_SUBJECT_TYPES,
} from "../../audit/audit.catalog.js";
import {
  normalizeAuditRequestContext,
  recordAuditEvent,
  type AuditRequestContext,
} from "../../audit/audit.service.js";
import type { CreateAuditLogData } from "../../audit/audit.repository.js";
import { sendEmailVerification, sendWelcomeEmail } from "../../mail/email-verification-mail.js";

function invalidTokenError() {
  return new ApplicationError(
    400,
    "INVALID_EMAIL_VERIFICATION_TOKEN",
    "Liên kết xác minh email không hợp lệ hoặc đã hết hạn",
  );
}

// Tạo token mới, gửi frontend URL và xóa token nếu delivery thất bại.
export async function requestEmailVerification(
  userId: string,
  context: AuditRequestContext,
  sessionId: string | null,
  now = new Date(),
) {
  const generated = generateEmailVerificationToken();
  const expiresAt = new Date(
    now.getTime() + env.EMAIL_VERIFICATION_TTL_MINUTES * 60_000,
  );
  const cooldownStartedAt = new Date(
    now.getTime() - env.EMAIL_VERIFICATION_COOLDOWN_SECONDS * 1_000,
  );
  const result = await createEmailVerificationToken({
    userId,
    tokenHash: generated.tokenHash,
    expiresAt,
    cooldownStartedAt,
  });

  if (result.status === "user-not-found") {
    throw new ApplicationError(
      404,
      "USER_NOT_FOUND",
      "Không tìm thấy người dùng",
    );
  }

  if (result.status === "rate-limited") {
    throw new ApplicationError(
      429,
      "EMAIL_VERIFICATION_RATE_LIMITED",
      "Vui lòng chờ trước khi yêu cầu gửi lại email xác minh",
    );
  }

  if (result.status === "already-verified") return { accepted: true };

  const verificationUrl = new URL("/verify-email", env.PUBLIC_WEB_URL);
  verificationUrl.searchParams.set("token", generated.token);

  try {
    await sendEmailVerification({
      to: result.email,
      name: result.displayName,
      verificationUrl: verificationUrl.toString(),
      expiresInMinutes: env.EMAIL_VERIFICATION_TTL_MINUTES,
    });
  } catch {
    await deleteEmailVerificationToken(result.tokenId);
    throw new ApplicationError(
      503,
      "EMAIL_DELIVERY_UNAVAILABLE",
      "Dịch vụ gửi email tạm thời không khả dụng",
    );
  }

  await recordAuditEvent({
    action: AUDIT_ACTIONS.EMAIL_VERIFICATION_REQUESTED,
    outcome: AUDIT_OUTCOMES.SUCCESS,
    actorUserId: userId,
    subjectType: AUDIT_SUBJECT_TYPES.USER,
    subjectId: userId,
    sessionId,
    ...context,
  });

  return { accepted: true };
}

// Hash raw token rồi consume nguyên tử; mọi trạng thái token sai dùng chung một lỗi.
export async function verifyEmail(
  token: string,
  context: AuditRequestContext,
  now = new Date(),
) {
  const normalizedContext = normalizeAuditRequestContext(context);
  const user = await consumeEmailVerificationToken(
    hashEmailVerificationToken(token),
    now,
    {
      action: AUDIT_ACTIONS.EMAIL_VERIFICATION_SUCCEEDED,
      outcome: AUDIT_OUTCOMES.SUCCESS,
      subjectType: AUDIT_SUBJECT_TYPES.USER,
      sessionId: null,
      ...normalizedContext,
    },
  );

  if (!user) {
    await recordAuditEvent({
      action: AUDIT_ACTIONS.EMAIL_VERIFICATION_FAILED,
      outcome: AUDIT_OUTCOMES.FAILURE,
      ...normalizedContext,
    });
    throw invalidTokenError();
  }

  // Verification is committed; a mail outage must not turn it into a failed API response.
  try {
    await sendWelcomeEmail({ to: user.email, name: user.displayName });
  } catch {
    console.error("Welcome email delivery failed");
  }
  return user;
}


type GeneratedEmailVerificationToken = {
  token: string;
  tokenHash: string;
};

// Băm raw token bằng SHA-256 để database không phải lưu secret có thể dùng trực tiếp.
function hashEmailVerificationToken(token: string): string {
  // `digest("hex")` biểu diễn 32 byte hash thành đúng 64 ký tự hexadecimal.
  return createHash("sha256").update(token).digest("hex");
}

// Sinh raw token đủ entropy cho URL và hash tương ứng để lưu vào database.
function generateEmailVerificationToken(): GeneratedEmailVerificationToken {
  // `base64url` không chứa ký tự cần escape khi token được đặt trong query string.
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashEmailVerificationToken(token),
  };
}


type CreateEmailVerificationTokenData = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  cooldownStartedAt: Date;
};

type CreateEmailVerificationTokenResult =
  | { status: "created"; tokenId: string; email: string; displayName: string | null }
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
function createEmailVerificationToken(
  data: CreateEmailVerificationTokenData,
): Promise<CreateEmailVerificationTokenResult> {
  return runSerializable(() =>
    prisma.$transaction(
      async (transaction) => {
        const user = await transaction.user.findUnique({
          where: { id: data.userId },
          select: { email: true, displayName: true, emailVerifiedAt: true },
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

        return { status: "created", tokenId: token.id, email: user.email, displayName: user.displayName };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
}

// Xóa đúng token vừa tạo để bù trừ khi mail delivery thất bại.
function deleteEmailVerificationToken(tokenId: string) {
  return prisma.emailVerificationToken.deleteMany({ where: { id: tokenId } });
}

// Consume token và xác minh user nguyên tử; count = 0 nghĩa là token không còn hợp lệ.
function consumeEmailVerificationToken(
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
