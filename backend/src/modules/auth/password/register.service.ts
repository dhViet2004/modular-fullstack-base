import { Prisma } from "@prisma/client";
import { ApplicationError } from "../../../core/http/application-error.js";
import { hashPassword } from "./password-hasher.js";
import { createPasswordUser } from "./register.repository.js";
import type { RegisterInput } from "./register.schema.js";

// Chuẩn hóa email trước khi lưu để tránh trùng do chữ hoa hoặc khoảng trắng.
function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

// Chuẩn hóa tên hiển thị; nếu không nhập thì trả về null cho database.
function normalizeDisplayName(displayName: string | undefined) {
  // `?.` chỉ gọi trim khi có giá trị; `|| null` đổi chuỗi rỗng thành null.
  return displayName?.trim() || null;
}

// Băm mật khẩu, tạo user và chuyển lỗi trùng email thành ApplicationError 409.
export async function registerWithPassword(input: RegisterInput) {
  const passwordHash = await hashPassword(input.password);

  // `try/catch` cho phép bắt lỗi Prisma phát sinh trong thao tác tạo dữ liệu.
  try {
    return await createPasswordUser({
      email: normalizeEmail(input.email),
      displayName: normalizeDisplayName(input.displayName),
      passwordHash,
    });
  } catch (error: unknown) {
    // `unknown` buộc code kiểm tra kiểu lỗi trước khi đọc thuộc tính của nó.
    if (
      // `instanceof` kiểm tra error có đúng là loại lỗi Prisma đã biết hay không.
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ApplicationError(
        409,
        "USER_EMAIL_ALREADY_EXISTS",
        "Email này đã được đăng ký",
      );
    }

    // Ném lại lỗi ngoài dự kiến để error middleware xử lý thay vì che giấu lỗi thật.
    throw error;
  }
}
