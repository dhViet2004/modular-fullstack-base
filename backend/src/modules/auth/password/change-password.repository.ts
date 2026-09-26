import { prisma } from "../../../core/database/prisma.js";

export function findPasswordHash(userId: string) {
  return prisma.passwordCredential.findUnique({
    where: { userId },
    select: { passwordHash: true },
  });
}

export function updatePasswordHash(userId: string, passwordHash: string) {
  return prisma.passwordCredential.update({
    where: { userId },
    data: { passwordHash },
  });
}
