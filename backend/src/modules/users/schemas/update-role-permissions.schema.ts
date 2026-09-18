import { z } from "zod";

export const updateRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string(), {
    message: "Danh sách quyền không được để trống"
  })
});
