import { ApplicationError } from "../../core/http/application-error.js";
import { prisma } from "../../core/database/prisma.js";
import { hashPassword, verifyPassword } from "./password/password-hasher.js";
import type { ChangePasswordInput } from "./auth.schema.js";

export const authService = {
  async changePassword(userId: string, input: ChangePasswordInput) {
    const credential = await prisma.passwordCredential.findUnique({
      where: { userId },
      select: { passwordHash: true },
    });

    if (!credential || !(await verifyPassword(credential.passwordHash, input.currentPassword))) {
      throw new ApplicationError(400, "INVALID_CURRENT_PASSWORD", "Mật khẩu hiện tại không đúng");
    }

    await prisma.passwordCredential.update({
      where: { userId },
      data: { passwordHash: await hashPassword(input.newPassword) },
    });
  },
};
