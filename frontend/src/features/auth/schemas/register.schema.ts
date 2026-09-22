import { z } from "zod";

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(254, "Email is too long"),
  password: z
    .string()
    .min(12, "Password must contain at least 12 characters")
    .max(128, "Password must contain at most 128 characters"),
  displayName: z
    .string()
    .trim()
    .max(100, "Display name must contain at most 100 characters"),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;