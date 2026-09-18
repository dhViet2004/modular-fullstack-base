import { prisma } from "../../../core/database/prisma.js";
import { ApiError } from "../../../core/http/api-error.js";
import { verifyPassword } from "../../../core/security/password.js";
import type { StrategyResult } from "../auth.types.js";

export const passwordStrategy = {
  async authenticate(email: string, password: string): Promise<StrategyResult> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { passwordCredential: true }
    });
    const credential = user?.passwordCredential;
    const valid = credential && await verifyPassword(credential.passwordHash, password);
    if (!user || !credential || !valid) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không chính xác");
    }

    if (credential.temporaryExpiresAt && credential.temporaryExpiresAt < new Date()) {
      throw new ApiError(
        401,
        "TEMPORARY_PASSWORD_EXPIRED",
        "Mật khẩu tạm thời đã hết hạn (chỉ có hiệu lực trong 24 giờ). Vui lòng liên hệ quản trị viên để được cấp lại mật khẩu mới."
      );
    }

    if (!user.emailVerifiedAt) {
      throw new ApiError(403, "EMAIL_NOT_VERIFIED", "Email chưa được xác minh");
    }

    return {
      provider: "PASSWORD",
      providerAccountId: user.id,
      email: user.email,
      emailVerified: true,
      userId: user.id
    };
  }
};
