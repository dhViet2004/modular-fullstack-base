import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type GeneratedRefreshToken = {
  token: string;
  tokenHash: string;
};

export type ParsedRefreshToken = {
  sessionId: string;
  secret: string;
};

// Băm secret bằng SHA-256 và trả chuỗi hexadecimal dài 64 ký tự.
export function hashRefreshTokenSecret(secret: string): string {
  // Chuỗi method createHash → update → digest tạo hash mà không lưu secret gốc.
  return createHash("sha256").update(secret).digest("hex");
}

// Sinh secret ngẫu nhiên và ghép thành refresh token dạng sessionId.secret.
export function generateRefreshToken(sessionId: string): GeneratedRefreshToken {
  // `randomBytes(32)` tạo 32 byte mật mã; base64url an toàn khi đặt trong cookie/URL.
  const secret = randomBytes(32).toString("base64url");
  const tokenHash = hashRefreshTokenSecret(secret);

  return {
    token: `${sessionId}.${secret}`,
    tokenHash,
  };
}

// Tách refresh token thành sessionId và secret; trả null nếu sai cấu trúc.
export function parseRefreshToken(token: string): ParsedRefreshToken | null {
  // `indexOf` trả vị trí dấu chấm đầu tiên hoặc -1 nếu không tìm thấy.
  const separatorIndex = token.indexOf(".");

  if (
    separatorIndex <= 0 ||
    separatorIndex === token.length - 1 ||
    token.indexOf(".", separatorIndex + 1) !== -1
  ) {
    return null;
  }

  return {
    // `slice(start, end)` cắt một phần chuỗi mà không thay đổi chuỗi ban đầu.
    sessionId: token.slice(0, separatorIndex),
    secret: token.slice(separatorIndex + 1),
  };
}

// So sánh secret nhận được với hash database theo thời gian ổn định.
export function verifyRefreshTokenSecret(
  secret: string,
  expectedHash: string,
): boolean {
  const actualHash = hashRefreshTokenSecret(secret);

  if (
    actualHash.length !== expectedHash.length ||
    // Regex này yêu cầu đúng 64 ký tự hexadecimal; cờ `i` không phân biệt hoa/thường.
    !/^[a-f0-9]{64}$/i.test(expectedHash)
  ) {
    return false;
  }

  // `timingSafeEqual` hạn chế rò rỉ thông tin qua thời gian so sánh.
  return timingSafeEqual(
    // `Buffer.from(..., "hex")` chuyển chuỗi hex thành dãy byte để so sánh.
    Buffer.from(actualHash, "hex"),
    Buffer.from(expectedHash, "hex"),
  );
}
