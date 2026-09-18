import { prisma } from "../../../core/database/prisma.js";

export const permissionService = {
  async resolve(userId: string): Promise<Set<string>> {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true
          }
        },
        permissionOverrides: {
          include: {
            permission: true
          }
        }
      }
    });

    const userRanks = user.roles.map(r => r.role.rank);
    const maxRank = userRanks.length > 0 ? Math.max(...userRanks) : 0;

    // Kế thừa thứ bậc: Cấp bậc cao hơn kế thừa toàn bộ quyền của các cấp bậc bên dưới
    const inheritedRoles = await prisma.role.findMany({
      where: { rank: { lte: maxRank } },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });

    const set = new Set<string>();
    for (const r of inheritedRoles) {
      for (const p of r.permissions) {
        set.add(p.permission.name);
      }
    }

    // Áp dụng dynamic permission overrides trực tiếp của user (ALLOW / DENY)
    for (const x of user.permissionOverrides) {
      if (x.effect === "ALLOW") {
        set.add(x.permission.name);
      } else {
        set.delete(x.permission.name);
      }
    }

    return set;
  }
};
