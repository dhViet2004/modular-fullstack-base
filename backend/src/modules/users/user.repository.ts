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
