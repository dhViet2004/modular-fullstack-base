import { prisma } from "../../../core/database/prisma.js";

export type CreatePasswordUserData = {
  email: string;
  displayName: string | null;
  passwordHash: string;
};

export function createPasswordUser(data: CreatePasswordUserData) {
  return prisma.user.create({
    data: {
      email: data.email,
      displayName: data.displayName,
      passwordCredential: {
        create: {
          passwordHash: data.passwordHash,
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
