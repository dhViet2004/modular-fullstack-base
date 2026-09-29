import { z } from "zod";

export const sessionIdParamsSchema = z.object({ id: z.uuid() });
