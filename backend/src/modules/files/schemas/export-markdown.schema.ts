import { z } from "zod"; export const exportMarkdownSchema=z.object({name:z.string().min(1).max(200),content:z.string()});
