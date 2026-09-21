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

export function createUser(input: CreateUserInput) {
  return createUserRecord({
    email: normalizeEmail(input.email),
    displayName: normalizeDisplayName(input.displayName),
  });
}
