import { z } from "zod";
export const updateTemplateSchema=z.object({subject:z.string().trim().min(1).max(180),html:z.string().trim().min(1).max(100_000)});
