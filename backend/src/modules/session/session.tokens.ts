import {
  createHash,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

import { env } from "../../config/env.js";

const privateKey = createPrivateKey({
  key: Buffer.from(env.JWT_PRIVATE_KEY_BASE64, "base64"),
  format: "der",
  type: "pkcs8",
});
const publicKey = createPublicKey({
  key: Buffer.from(env.JWT_PUBLIC_KEY_BASE64, "base64"),
  format: "der",
  type: "spki",
});

export async function signAccessToken(userId: string, sessionId: string) {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(
      Math.floor(Date.now() / 1000) + env.JWT_ACCESS_TTL_SECONDS,
    )
    .sign(privateKey);
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, publicKey, {
    algorithms: ["RS256"],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
  if (typeof payload.sub !== "string" || typeof payload.sid !== "string") {
    throw new Error("Invalid access token claims");
  }
  return { userId: payload.sub, sessionId: payload.sid };
}

export function createRefreshToken(sessionId: string) {
  const secret = randomBytes(32).toString("base64url");
  return { token: `${sessionId}.${secret}`, secretHash: hash(secret) };
}

export function parseRefreshToken(token: string) {
  const separator = token.indexOf(".");
  if (
    separator <= 0 ||
    separator === token.length - 1 ||
    token.indexOf(".", separator + 1) !== -1
  ) {
    return null;
  }
  return {
    sessionId: token.slice(0, separator),
    secret: token.slice(separator + 1),
  };
}

export function matchesRefreshSecret(secret: string, expectedHash: string) {
  const actualHash = hash(secret);
  if (
    actualHash.length !== expectedHash.length ||
    !/^[a-f0-9]{64}$/i.test(expectedHash)
  ) {
    return false;
  }
  return timingSafeEqual(
    Buffer.from(actualHash, "hex"),
    Buffer.from(expectedHash, "hex"),
  );
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
