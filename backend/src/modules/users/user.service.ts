import { Prisma } from "@prisma/client";
import { ApplicationError } from "../../core/http/application-error.js";
import { prisma } from "../../core/database/prisma.js";

export type CreateUserInput = {
  email: string;
  displayName?: string | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeDisplayName(displayName: string | null | undefined) {
  const normalized = displayName?.trim();
  return normalized || null;
}

export function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
}

// Limit selected fields because this result is used by the admin user list.
export function listUsers() {
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
      roles: {
        select: {
          role: {
            select: { code: true },
          },
        },
      },
    },
  });
}

export async function createUser(input: CreateUserInput) {
  try {
    return await prisma.user.create({
      data: {
        email: normalizeEmail(input.email),
        displayName: normalizeDisplayName(input.displayName),
      },
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ApplicationError(
        409,
        "USER_EMAIL_ALREADY_EXISTS",
        "Email người dùng đã tồn tại",
      );
    }

    throw error;
  }
}

export async function setAdminRole(userId: string, enabled: boolean) {
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
}
