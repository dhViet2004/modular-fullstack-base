import { ApplicationError } from "../../../core/http/application-error.js";
import { createAuthSession } from "../session/session.service.js";
import { findPasswordUserByEmail } from "./login.repository.js";
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

// Xác thực email/mật khẩu, kiểm tra trạng thái user và tạo session đăng nhập.
export async function loginWithPassword(input: LoginInput) {
  const user = await findPasswordUserByEmail(normalizeEmail(input.email));

  // `?.` là optional chaining: không đọc passwordCredential nếu user là null.
  if (!user?.passwordCredential) {
    // `throw` dừng function và chuyển lỗi tới error middleware.
    throw invalidCredentialsError();
  }

  const passwordIsValid = await verifyPassword(
    user.passwordCredential.passwordHash,
    input.password,
  );

  // `!` đảo giá trị boolean: false trở thành true.
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

  const session = await createAuthSession(user.id);

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
