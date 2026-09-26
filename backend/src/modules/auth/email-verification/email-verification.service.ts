import { env } from "../../../config/env.js";
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
import { sendEmailVerification } from "../../mail/email-verification-mail.js";
import {
  consumeEmailVerificationToken,
  createEmailVerificationToken,
  deleteEmailVerificationToken,
} from "./email-verification.repository.js";
import {
  generateEmailVerificationToken,
  hashEmailVerificationToken,
} from "./email-verification-token.js";

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
      verificationUrl: verificationUrl.toString(),
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

  return user;
}
