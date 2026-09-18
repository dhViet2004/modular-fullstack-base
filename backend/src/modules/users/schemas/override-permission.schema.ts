import { z } from "zod";

export const overridePermissionSchema = z.object({
  permissionId: z.string().min(1, "Permission ID không được để trống"),
  effect: z.enum(["ALLOW", "DENY"])
});
