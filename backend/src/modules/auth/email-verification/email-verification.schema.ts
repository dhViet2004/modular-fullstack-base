import { z } from "zod";

// Token vẫn là input không tin cậy; giới hạn chiều dài trước khi service xử lý.
export const verifyEmailSchema = z.object({
  token: z.string().min(1).max(512),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
