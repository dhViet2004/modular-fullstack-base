import { Prisma } from "@prisma/client";
import { ApplicationError } from "../../core/http/application-error.js";

import {
  createUser as createUserRecord,
  findUserByEmail,
  findUserById,
} from "./user.repository.js";

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
  return findUserById(id);
}

export function getUserByEmail(email: string) {
  return findUserByEmail(normalizeEmail(email));
}

export async function createUser(input: CreateUserInput) {
  try {
    return await createUserRecord({
      email: normalizeEmail(input.email),
      displayName: normalizeDisplayName(input.displayName),
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ApplicationError(
        409,
        "USER_EMAIL_ALREADY_EXISTS",
        "Email này đã được đăng ký",
      );
    }

    throw error;
  }
}
