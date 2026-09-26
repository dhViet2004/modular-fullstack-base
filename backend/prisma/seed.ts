import { PrismaClient } from "@prisma/client";
import {
  PERMISSIONS,
  ROLE_CODES,
  ROLE_PERMISSIONS,
  type PermissionCode,
  type RoleCode,
} from "../src/modules/access/permission.catalog.js";

const prisma = new PrismaClient();

const permissionDescriptions: Record<PermissionCode, string> = {
  [PERMISSIONS.PROFILE_READ_SELF]: "Đọc hồ sơ của chính mình",
  [PERMISSIONS.PROFILE_UPDATE_SELF]: "Cập nhật hồ sơ của chính mình",
  [PERMISSIONS.USERS_READ]: "Xem danh sách và chi tiết người dùng",
  [PERMISSIONS.USERS_UPDATE]: "Cập nhật người dùng khác",
  [PERMISSIONS.USERS_SUSPEND]: "Khóa hoặc mở khóa người dùng",
  [PERMISSIONS.ROLES_MANAGE]: "Quản lý role và permission",
  [PERMISSIONS.AUDIT_READ]: "Xem audit log bảo mật và quản trị",
};

const roleDefinitions: Record<RoleCode, { name: string; description: string }> =
  {
    [ROLE_CODES.SUPER_ADMIN]: {
      name: "Siêu quản trị viên",
      description: "Quản trị hệ thống và quyền truy cập",
    },
    [ROLE_CODES.ADMIN]: {
      name: "Quản trị viên",
      description: "Có toàn bộ permission nền tảng",
    },
    [ROLE_CODES.MEMBER]: {
      name: "Thành viên",
      description: "Quyền cơ bản cho người dùng đã đăng ký",
    },
  };

// Tạo hoặc cập nhật permission, role và quan hệ giữa chúng theo catalog trong code.
async function seedAccessControl() {
  for (const code of Object.values(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { code },
      update: { description: permissionDescriptions[code] },
      create: { code, description: permissionDescriptions[code] },
    });
  }

  for (const code of Object.values(ROLE_CODES)) {
    const definition = roleDefinitions[code];
    const role = await prisma.role.upsert({
      where: { code },
      update: definition,
      create: { code, ...definition },
    });

    const permissions = await prisma.permission.findMany({
      where: {
        code: {
          in: [...ROLE_PERMISSIONS[code]],
        },
      },
      select: { id: true },
    });

    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    });
  }

  const memberRole = await prisma.role.findUniqueOrThrow({
    where: { code: ROLE_CODES.MEMBER },
    select: { id: true },
  });
  const users = await prisma.user.findMany({ select: { id: true } });

  await prisma.userRole.createMany({
    data: users.map((user) => ({
      userId: user.id,
      roleId: memberRole.id,
    })),
    skipDuplicates: true,
  });

  const email = process.env.RBAC_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (email) {
    const adminRole = await prisma.role.findUniqueOrThrow({
      where: { code: ROLE_CODES.SUPER_ADMIN },
      select: { id: true },
    });
    const adminUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!adminUser) {
      throw new Error(`RBAC SUPER_ADMIN user not found: ${email}`);
    }

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    });
  }
}

async function main() {
  await prisma.$queryRaw`SELECT 1`;
  await seedAccessControl();
  console.log("Database connection and RBAC seed verified.");
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
