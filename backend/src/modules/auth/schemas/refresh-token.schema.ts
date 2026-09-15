import { z } from "zod"; export const refreshSchema=z.object({sessionId:z.string().min(1),refreshToken:z.string().min(20)});
