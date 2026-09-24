import { createPrivateKey, createPublicKey } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

import { env } from "../../../config/env.js";

// `Buffer.from(base64)` giải mã chuỗi .env thành DER bytes; PKCS#8 là định dạng private key.
const privateKey = createPrivateKey({
  key: Buffer.from(env.JWT_PRIVATE_KEY_BASE64, "base64"),
  format: "der",
  type: "pkcs8",
});

// SPKI là định dạng public key dùng để xác minh JWT mà không thể ký token mới.
const publicKey = createPublicKey({
  key: Buffer.from(env.JWT_PUBLIC_KEY_BASE64, "base64"),
  format: "der",
  type: "spki",
});

type SignAccessTokenInput = {
  userId: string;
  sessionId: string;
};

export type VerifiedAccessToken = {
  userId: string;
  sessionId: string;
};

// Ký access token JWT bằng RSA private key và gắn userId/sessionId vào claims.
export async function signAccessToken(
  input: SignAccessTokenInput,
): Promise<string> {
  // `Date.now()` trả millisecond; chia 1000 và `Math.floor` để lấy Unix timestamp giây.
  const expiresAt = Math.floor(Date.now() / 1000) + env.JWT_ACCESS_TTL_SECONDS;

  // `new SignJWT` tạo JWT builder; các method nối tiếp cấu hình claims và chữ ký.
  return new SignJWT({
    sid: input.sessionId,
  })
    .setProtectedHeader({
      alg: "RS256",
      typ: "JWT",
    })
    .setSubject(input.userId)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(privateKey);
}

// Xác minh chữ ký, thời hạn, issuer và audience rồi trả claims đã thu hẹp kiểu.
export async function verifyAccessToken(
  token: string,
): Promise<VerifiedAccessToken> {
  // Destructuring `{ payload }` lấy riêng thuộc tính payload từ kết quả jwtVerify.
  const { payload } = await jwtVerify(token, publicKey, {
    algorithms: ["RS256"],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });

  // `typeof` kiểm tra kiểu runtime; `||` đúng khi ít nhất một claim không hợp lệ.
  if (typeof payload.sub !== "string" || typeof payload.sid !== "string") {
    throw new Error("Invalid access token claims");
  }

  return {
    userId: payload.sub,
    sessionId: payload.sid,
  };
}
