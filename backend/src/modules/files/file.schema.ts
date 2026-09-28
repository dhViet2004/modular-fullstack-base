import { z } from "zod";

export const fileIdParamsSchema = z.object({ id: z.string().uuid() });
