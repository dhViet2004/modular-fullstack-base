import { z } from "zod";

export const setAdminRoleSchema = z.object({ enabled: z.boolean() });
export const setAdminRoleParamsSchema = z.object({ userId: z.string().min(1) });
