import { z } from "zod";

// Schema kiểm tra dữ liệu đăng ký trước khi controller và service được gọi.
export const registerSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z
    .string()
    .min(12, "Mật khẩu phải có ít nhất 12 ký tự")
    .max(128, "Mật khẩu không được vượt quá 128 ký tự"),
  displayName: z.string().trim().min(1).max(100).optional(),
});

// `z.infer<typeof ...>` giúp schema runtime và type TypeScript dùng chung một nguồn.
export type RegisterInput = z.infer<typeof registerSchema>;
