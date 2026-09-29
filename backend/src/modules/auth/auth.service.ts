import { ApplicationError } from "../../core/http/application-error.js";
import { prisma } from "../../core/database/prisma.js";
import {
  AUDIT_ACTIONS,
  AUDIT_OUTCOMES,
  AUDIT_SUBJECT_TYPES,
} from "../audit/audit.catalog.js";
import { recordAuditEvent } from "../audit/audit.service.js";
import { createAuthSession } from "../session/session.service.js";
import { Prisma } from "@prisma/client";
import argon2 from "argon2";
import { ROLE_CODES } from "../access/permission.catalog.js";
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
} from "./auth.schema.js";
import type { AuditRequestContext } from "../audit/audit.service.js";

const PASSWORD_HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
} satisfies argon2.HashOptions;

function hashPassword(password: string) {
  return argon2.hash(password, PASSWORD_HASH_OPTIONS);
}

function verifyPassword(passwordHash: string, password: string) {
  return argon2.verify(passwordHash, password);
}

export const authService = {
  register,
  login,
  async changePassword(userId: string, input: ChangePasswordInput) {
    const credential = await prisma.passwordCredential.findUnique({
      where: { userId },
      select: { passwordHash: true },
    });

    if (credential && (!input.currentPassword ||
      !(await verifyPassword(credential.passwordHash, input.currentPassword)))) {
      throw new ApplicationError(
        400,
        "INVALID_CURRENT_PASSWORD",
        "Mật khẩu hiện tại không đúng",
      );
    }

    const passwordHash = await hashPassword(input.newPassword);
    if (credential) {
      await prisma.passwordCredential.update({ where: { userId }, data: { passwordHash } });
    } else {
      await prisma.passwordCredential.create({ data: { userId, passwordHash } });
    }
  },
};

function invalidCredentialsError() {
  return new ApplicationError(
    401,
    "INVALID_CREDENTIALS",
    "Email hoặc mật khẩu không đúng",
  );
}

async function login(input: LoginInput, context: AuditRequestContext) {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(input.email) },
    select: {
      id: true,
      email: true,
      displayName: true,
      status: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
      passwordCredential: { select: { passwordHash: true } },
    },
  });

  if (!user?.passwordCredential) {
    await recordFailedLogin(null, context);
    throw invalidCredentialsError();
  }

  if (
    !(await verifyPassword(
      user.passwordCredential.passwordHash,
      input.password,
    ))
  ) {
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

async function recordFailedLogin(
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeDisplayName(displayName: string | undefined) {
  return displayName?.trim() || null;
}

async function register(input: RegisterInput) {
  const passwordHash = await hashPassword(input.password);
  try {
    return await prisma.user.create({
      data: {
        email: normalizeEmail(input.email),
        displayName: normalizeDisplayName(input.displayName),
        passwordCredential: { create: { passwordHash } },
        roles: { create: { role: { connect: { code: ROLE_CODES.MEMBER } } } },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ApplicationError(
        409,
        "USER_EMAIL_ALREADY_EXISTS",
        "Email này đã được đăng ký",
      );
    }
    throw error;
  }
}
