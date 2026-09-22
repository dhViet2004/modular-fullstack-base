import { Prisma } from "@prisma/client";
import { ApplicationError } from "../../../core/http/application-error.js";
import { hashPassword } from "./password-hasher.js";
import { createPasswordUser } from "./register.repository.js";
import type { RegisterInput } from "./register.schema.js";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeDisplayName(displayName: string | undefined) {
  return displayName?.trim() || null;
}

export async function registerWithPassword(input: RegisterInput) {
  const passwordHash = await hashPassword(input.password);

  try {
    return await createPasswordUser({
      email: normalizeEmail(input.email),
      displayName: normalizeDisplayName(input.displayName),
      passwordHash,
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ApplicationError(
        409,
        "USER_EMAIL_ALREADY_EXISTS",
        "A user with this email already exists",
      );
    }

    throw error;
  }
}
