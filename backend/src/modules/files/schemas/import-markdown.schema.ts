import { z } from "zod"; export const importMarkdownSchema=z.object({content:z.string().min(1)});
