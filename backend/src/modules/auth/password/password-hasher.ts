import argon2 from "argon2";

const PASSWORD_HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
} satisfies argon2.HashOptions;

export function hashPassword(password: string) {
  return argon2.hash(password, PASSWORD_HASH_OPTIONS);
}

export function verifyPassword(passwordHash: string, password: string) {
  return argon2.verify(passwordHash, password);
}
