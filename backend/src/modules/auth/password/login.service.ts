import { ApplicationError } from "../../../core/http/application-error.js";
import { findPasswordUserByEmail } from "./login.repository.js";
import type { LoginInput } from "./login.schema.js";
import { verifyPassword } from "./password-hasher.js";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function invalidCredentialsError() {
  return new ApplicationError(
    401,
    "INVALID_CREDENTIALS",
    "Email hoặc mật khẩu không đúng",
  );
}

export async function loginWithPassword(input: LoginInput) {
  const user = await findPasswordUserByEmail(normalizeEmail(input.email));

  if (!user?.passwordCredential) {
    throw invalidCredentialsError();
  }

  const passwordIsValid = await verifyPassword(
    user.passwordCredential.passwordHash,
    input.password,
  );

  if (!passwordIsValid) {
    throw invalidCredentialsError();
  }

  if (user.status === "SUSPENDED") {
    throw new ApplicationError(
      403,
      "ACCOUNT_SUSPENDED",
      "Tài khoản đã bị tạm khóa",
    );
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
