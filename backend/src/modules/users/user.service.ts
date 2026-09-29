import { ApplicationError } from "../../core/http/application-error.js";
import { prisma } from "../../core/database/prisma.js";

// User administration currently exposes only listing and ADMIN role management.
export const userService = {
  listUsers() {
    return prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        roles: { select: { role: { select: { code: true } } } },
      },
    });
  },

  async setAdminRole(userId: string, enabled: boolean) {
    const [user, role] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      prisma.role.findUniqueOrThrow({
        where: { code: "ADMIN" },
        select: { id: true },
      }),
    ]);
    if (!user) {
      throw new ApplicationError(404, "USER_NOT_FOUND", "Không tìm thấy user");
    }
    if (enabled) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId, roleId: role.id } },
        update: {},
        create: { userId, roleId: role.id },
      });
    } else {
      await prisma.userRole.deleteMany({ where: { userId, roleId: role.id } });
    }
  },
};
