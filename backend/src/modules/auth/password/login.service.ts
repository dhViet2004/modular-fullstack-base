import { ApplicationError } from "../../../core/http/application-error.js";
import { prisma } from "../../../core/database/prisma.js";
import {
  AUDIT_ACTIONS,
  AUDIT_OUTCOMES,
  AUDIT_SUBJECT_TYPES,
} from "../../audit/audit.catalog.js";
import {
  recordAuditEvent,
  type AuditRequestContext,
} from "../../audit/audit.service.js";
import { createAuthSession } from "../session/session.service.js";
import type { LoginInput } from "./login.schema.js";
import { verifyPassword } from "./password-hasher.js";

// Chuẩn hóa email để việc tìm kiếm không bị ảnh hưởng bởi khoảng trắng hoặc chữ hoa.
function normalizeEmail(email: string) {
  // `trim` xóa khoảng trắng hai đầu; `toLowerCase` chuyển thành chữ thường.
  return email.trim().toLowerCase();
}

// Tạo cùng một lỗi cho email không tồn tại và mật khẩu sai để tránh lộ tài khoản.
function invalidCredentialsError() {
  return new ApplicationError(
    401,
    "INVALID_CREDENTIALS",
    "Email hoặc mật khẩu không đúng",
  );
}

function recordFailedLogin(
  userId: string | null,
  context: AuditRequestContext,
) {
  return recordAuditEvent({
    action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
    outcome: AUDIT_OUTCOMES.FAILURE,
    ...(userId
      ? {
          actorUserId: userId,
          subjectType: AUDIT_SUBJECT_TYPES.USER,
          subjectId: userId,
        }
      : {}),
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });
}

// Xác thực email/mật khẩu, kiểm tra trạng thái user và tạo session đăng nhập.
export async function loginWithPassword(
  input: LoginInput,
  context: AuditRequestContext,
) {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(input.email) },
    select: {
      id: true, email: true, displayName: true, status: true,
      emailVerifiedAt: true, createdAt: true, updatedAt: true,
      passwordCredential: { select: { passwordHash: true } },
    },
  });

  // `?.` là optional chaining: không đọc passwordCredential nếu user là null.
  if (!user?.passwordCredential) {
    await recordFailedLogin(null, context);
    // `throw` dừng function và chuyển lỗi tới error middleware.
    throw invalidCredentialsError();
  }

  const passwordIsValid = await verifyPassword(
    user.passwordCredential.passwordHash,
    input.password,
  );

  // `!` đảo giá trị boolean: false trở thành true.
  if (!passwordIsValid) {
    await recordFailedLogin(user.id, context);
    throw invalidCredentialsError();
  }

  if (user.status === "SUSPENDED") {
    await recordFailedLogin(user.id, context);
    throw new ApplicationError(
      403,
      "ACCOUNT_SUSPENDED",
      "Tài khoản đã bị tạm khóa",
    );
  }

  const session = await createAuthSession(user.id, context);

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    session,
  };
}
