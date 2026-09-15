import { z } from "zod"; export const loginSchema=z.object({email:z.email().transform(v=>v.toLowerCase()),password:z.string().min(8),fingerprint:z.string().max(200).optional()});
