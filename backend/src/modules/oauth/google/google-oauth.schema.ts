import { z } from "zod";
export const googleOAuthExchangeSchema=z.object({code:z.string().min(20)});
