import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";

import { env } from "../../../config/env.js";
import { ApplicationError } from "../../../core/http/application-error.js";
import { AUDIT_ACTIONS, AUDIT_OUTCOMES } from "../../audit/audit.catalog.js";
import {
  recordAuditEvent,
  type AuditRequestContext,
} from "../../audit/audit.service.js";
import { createAuthSession } from "../../session/session.service.js";
import { prisma } from "../../../core/database/prisma.js";
import { ROLE_CODES } from "../../access/permission.catalog.js";
import {
  createGoogleAuthorizationUrl,
  exchangeGoogleAuthorizationCode,
  verifyGoogleIdToken,
} from "./google-oauth-client.js";

const MILLISECONDS_PER_MINUTE = 60_000;

function googleLoginError() {
  return new ApplicationError(
    401,
    "GOOGLE_LOGIN_FAILED",
    "KhÃ´ng thá»ƒ Ä‘Äƒng nháº­p báº±ng Google",
  );
}

export function recordGoogleOAuthFailure(context: AuditRequestContext) {
  return recordAuditEvent({
    action: AUDIT_ACTIONS.AUTH_GOOGLE_LOGIN_FAILED,
    outcome: AUDIT_OUTCOMES.FAILURE,
    ...context,
  });
}

// Táº¡o attempt ngáº¯n háº¡n rá»“i tráº£ authorization URL Ä‘á»ƒ controller redirect browser.
export async function startGoogleOAuth(now = new Date()): Promise<string> {
  const attempt = generateOAuthAttempt();

  await createGoogleOAuthAttempt({
    stateHash: attempt.stateHash,
    codeVerifier: attempt.codeVerifier,
    expiresAt: new Date(
      now.getTime() +
        env.GOOGLE_OAUTH_ATTEMPT_TTL_MINUTES * MILLISECONDS_PER_MINUTE,
    ),
  });

  return createGoogleAuthorizationUrl(attempt.state, attempt.codeChallenge);
}

export async function completeGoogleOAuth(
  code: string,
  state: string,
  context: AuditRequestContext,
  now = new Date(),
) {
  try {
    const codeVerifier = await consumeGoogleOAuthAttempt(
      hashOAuthState(state),
      now,
    );

    if (!codeVerifier) throw googleLoginError();

    const idToken = await exchangeGoogleAuthorizationCode(code, codeVerifier);
    const identity = await verifyGoogleIdToken(idToken);
    const user = await resolveGoogleUser(identity, now);

    if (user.status === "SUSPENDED") {
      throw new ApplicationError(
        403,
        "ACCOUNT_SUSPENDED",
        "TÃ i khoáº£n Ä‘Ã£ bá»‹ táº¡m khÃ³a",
      );
    }

    return {
      user,
      session: await createAuthSession(
        user.id,
        context,
        AUDIT_ACTIONS.AUTH_GOOGLE_LOGIN_SUCCEEDED,
      ),
    };
  } catch (error: unknown) {
    await recordGoogleOAuthFailure(context);

    if (error instanceof ApplicationError) throw error;

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw googleLoginError();
    }

    throw error;
  }
}

type GeneratedGoogleOAuthAttempt = {
  state: string;
  stateHash: string;
  codeVerifier: string;
  codeChallenge: string;
};

// Băm state trước khi persist để database không chứa giá trị callback dùng trực tiếp.
function hashOAuthState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

function createCodeChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

// Sinh state chống CSRF và cặp PKCE S256 cho một lần bắt đầu Google OAuth.
function generateOAuthAttempt(): GeneratedGoogleOAuthAttempt {
  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(32).toString("base64url");

  return {
    state,
    stateHash: hashOAuthState(state),
    codeVerifier,
    codeChallenge: createCodeChallenge(codeVerifier),
  };
}

type GoogleIdentity = {
  googleSubject: string;
  email: string;
  displayName: string | null;
};
type CreateGoogleOAuthAttemptData = {
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
function createGoogleOAuthAttempt(data: CreateGoogleOAuthAttemptData) {
  return prisma.googleOAuthAttempt.create({ data, select: { id: true } });
}

// Consume state bằng conditional update để hai callback không thể dùng cùng attempt.
function consumeGoogleOAuthAttempt(stateHash: string, now: Date) {
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
function resolveGoogleUser(identity: GoogleIdentity, verifiedAt: Date) {
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
