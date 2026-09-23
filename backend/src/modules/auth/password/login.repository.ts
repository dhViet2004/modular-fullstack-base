import { prisma } from "../../../core/database/prisma.js";

export function findPasswordUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      displayName: true,
      status: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
      passwordCredential: {
        select: {
          passwordHash: true,
        },
      },
    },
  });
}
