import { z } from "zod";

// `z.object` mô tả và kiểm tra cấu trúc body của request đăng nhập ở runtime.
export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

// `typeof` lấy kiểu của biến schema; `z.infer` suy ra kiểu TypeScript từ Zod schema.
export type LoginInput = z.infer<typeof loginSchema>;
