import { z } from "zod";

export const createRoleSchema = z.object({
  name: z
    .string()
    .min(2, "Tên vai trò tối thiểu 2 ký tự")
    .max(50, "Tên vai trò tối đa 50 ký tự")
    .regex(/^[A-Z0-9_]+$/, "Tên vai trò chỉ chứa chữ hoa, số và dấu gạch dưới (VD: MODERATOR, CONTENT_MANAGER)"),
  rank: z
    .number({ message: "Cấp bậc (Rank) phải là một số nguyên" })
    .int("Cấp bậc (Rank) phải là số nguyên")
    .min(1, "Cấp bậc (Rank) tối thiểu là 1")
    .max(99, "Cấp bậc tùy chỉnh tối đa là 99 (Rank 100 dành riêng cho Super Admin)"),
  permissionIds: z.array(z.string()).optional()
});
