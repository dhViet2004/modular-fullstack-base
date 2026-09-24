import argon2 from "argon2";

const PASSWORD_HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
  // `satisfies` kiểm tra object đúng kiểu nhưng vẫn giữ kiểu cụ thể của từng giá trị.
} satisfies argon2.HashOptions;

// Băm mật khẩu bằng Argon2id; kết quả chứa salt và các tham số cần để verify.
export function hashPassword(password: string) {
  return argon2.hash(password, PASSWORD_HASH_OPTIONS);
}

// So sánh mật khẩu người dùng nhập với chuỗi hash đã lưu trong database.
export function verifyPassword(passwordHash: string, password: string) {
  return argon2.verify(passwordHash, password);
}
