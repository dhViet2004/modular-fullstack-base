import { z } from "zod"; export const fileIdSchema=z.object({id:z.string().min(1)});
