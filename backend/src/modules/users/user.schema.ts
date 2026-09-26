import { z } from "zod";

export const setAdminRoleSchema = z.object({ enabled: z.boolean() });
