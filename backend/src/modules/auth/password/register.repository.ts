import { prisma } from "../../../core/database/prisma.js";
import { ROLE_CODES } from "../../access/permission.catalog.js";

export type CreatePasswordUserData = {
  email: string;
  displayName: string | null;
  passwordHash: string;
};

// Tạo User và PasswordCredential trong cùng một câu lệnh Prisma lồng nhau.
export function createPasswordUser(data: CreatePasswordUserData) {
  // Prisma thực hiện nested create trong transaction nên không tạo user thiếu credential.
  return prisma.user.create({
    data: {
      email: data.email,
      displayName: data.displayName,
      passwordCredential: {
        create: {
          passwordHash: data.passwordHash,
        },
      },
      roles: {
        create: {
          role: {
            connect: {
              code: ROLE_CODES.MEMBER,
            },
          },
        },
      },
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      status: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
