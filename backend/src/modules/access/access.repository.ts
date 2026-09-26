import { prisma } from "../../core/database/prisma.js";
import type { PermissionCode } from "./permission.catalog.js";

// Kiểm tra trực tiếp trong database xem user có permission qua bất kỳ role nào không.
export async function userHasPermission(
  userId: string,
  permission: PermissionCode,
): Promise<boolean> {
  const assignment = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        permissions: {
          some: {
            permission: {
              code: permission,
            },
          },
        },
      },
    },
    select: {
      userId: true,
    },
  });

  return assignment !== null;
}

export async function userHasRole(userId: string, roleCode: string) {
  const assignment = await prisma.userRole.findUnique({
    where: {
      userId_roleId: {
        userId,
        roleId: (
          await prisma.role.findUniqueOrThrow({
            where: { code: roleCode },
            select: { id: true },
          })
        ).id,
      },
    },
    select: { userId: true },
  });
  return assignment !== null;
}

// Lấy role và permission hiệu lực để trả cho frontend sau khi user đã được xác thực.
export async function findAccessContextByUserId(userId: string) {
  const assignments = await prisma.userRole.findMany({
    where: { userId },
    select: {
      role: {
        select: {
          code: true,
          permissions: {
            select: {
              permission: {
                select: {
                  code: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return assignments;
}
