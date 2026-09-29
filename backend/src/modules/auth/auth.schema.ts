import { z } from "zod";

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(12).max(128),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const registerSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z
    .string()
    .min(12, "Mật khẩu phải có ít nhất 12 ký tự")
    .max(128, "Mật khẩu không được vượt quá 128 ký tự"),
  displayName: z.string().trim().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
