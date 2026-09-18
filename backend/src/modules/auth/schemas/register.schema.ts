import {z} from "zod";
export const registerSchema=z.object({email:z.email().transform(value=>value.toLowerCase()),password:z.string().min(12).max(128),displayName:z.string().trim().min(2).max(100).optional()});
