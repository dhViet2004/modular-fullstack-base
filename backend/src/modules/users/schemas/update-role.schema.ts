import { z } from "zod"; export const updateRoleSchema=z.object({roleId:z.string().min(1)});
