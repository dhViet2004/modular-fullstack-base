import { Prisma } from "@prisma/client";

import { env } from "../../../config/env.js";
import { ApplicationError } from "../../../core/http/application-error.js";
import { AUDIT_ACTIONS, AUDIT_OUTCOMES } from "../../audit/audit.catalog.js";
import {
  recordAuditEvent,
  type AuditRequestContext,
} from "../../audit/audit.service.js";
import { createAuthSession } from "../session/session.service.js";
import {
  createGoogleAuthorizationUrl,
  exchangeGoogleAuthorizationCode,
  verifyGoogleIdToken,
} from "./google-oauth-client.js";
import {
  consumeGoogleOAuthAttempt,
  createGoogleOAuthAttempt,
  resolveGoogleUser,
} from "./google-oauth.repository.js";
import {
  generateGoogleOAuthAttempt,
  hashGoogleOAuthState,
} from "./google-oauth-state.js";

const MILLISECONDS_PER_MINUTE = 60_000;

function googleLoginError() {
  return new ApplicationError(
    401,
    "GOOGLE_LOGIN_FAILED",
    "Không thể đăng nhập bằng Google",
  );
}

export function recordGoogleOAuthFailure(context: AuditRequestContext) {
  return recordAuditEvent({
    action: AUDIT_ACTIONS.AUTH_GOOGLE_LOGIN_FAILED,
    outcome: AUDIT_OUTCOMES.FAILURE,
    ...context,
  });
}

// Tạo attempt ngắn hạn rồi trả authorization URL để controller redirect browser.
export async function startGoogleOAuth(now = new Date()): Promise<string> {
  const attempt = generateGoogleOAuthAttempt();

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

// Consume state, xác minh Google identity, resolve user và tái sử dụng session JWT hiện có.
export async function completeGoogleOAuth(
  code: string,
  state: string,
  context: AuditRequestContext,
  now = new Date(),
) {
  try {
    const codeVerifier = await consumeGoogleOAuthAttempt(
      hashGoogleOAuthState(state),
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
        "Tài khoản đã bị tạm khóa",
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
