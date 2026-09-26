import { createHash, randomBytes } from "node:crypto";

export type GeneratedEmailVerificationToken = {
  token: string;
  tokenHash: string;
};

// Băm raw token bằng SHA-256 để database không phải lưu secret có thể dùng trực tiếp.
export function hashEmailVerificationToken(token: string): string {
  // `digest("hex")` biểu diễn 32 byte hash thành đúng 64 ký tự hexadecimal.
  return createHash("sha256").update(token).digest("hex");
}

// Sinh raw token đủ entropy cho URL và hash tương ứng để lưu vào database.
export function generateEmailVerificationToken(): GeneratedEmailVerificationToken {
  // `base64url` không chứa ký tự cần escape khi token được đặt trong query string.
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashEmailVerificationToken(token),
  };
}
