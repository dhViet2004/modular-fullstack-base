import { z } from "zod";

export const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Email là bắt buộc")
      .email("Email không hợp lệ")
      .max(254, "Email không được vượt quá 254 ký tự"),
    password: z
      .string()
      .min(12, "Mật khẩu phải có ít nhất 12 ký tự")
      .max(128, "Mật khẩu không được vượt quá 128 ký tự"),
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu"),
    displayName: z
      .string()
      .trim()
      .max(100, "Tên hiển thị không được vượt quá 100 ký tự"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu nhập lại chưa khớp",
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
