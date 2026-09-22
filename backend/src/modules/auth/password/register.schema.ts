import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z
    .string()
    .min(12, "Password must contain at least 12 characters")
    .max(128, "Password must contain at most 128 characters"),
  displayName: z.string().trim().min(1).max(100).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
