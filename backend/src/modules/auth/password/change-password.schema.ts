import { z } from "zod";

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(128),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
