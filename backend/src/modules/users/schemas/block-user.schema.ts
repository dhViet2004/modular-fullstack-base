import { z } from "zod"; export const blockUserSchema=z.object({reason:z.string().max(500).optional()});
