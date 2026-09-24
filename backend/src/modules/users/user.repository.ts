import { prisma } from "../../core/database/prisma.js";

export type CreateUserData = {
  email: string;
  displayName: string | null;
};

export function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
  });
}

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export function createUser(data: CreateUserData) {
  return prisma.user.create({
    data,
  });
}

// Lấy danh sách user an toàn cho màn hình quản trị, không trả credential hoặc session.
export function findUsers() {
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
            select: {
              code: true,
            },
          },
        },
      },
    },
  });
}
