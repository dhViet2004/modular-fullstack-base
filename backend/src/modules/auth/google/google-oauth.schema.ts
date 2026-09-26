import { z } from "zod";

export const googleOAuthCallbackQuerySchema = z
  .object({
    code: z.string().min(1).optional(),
    state: z.string().min(1).max(512).optional(),
    error: z.string().min(1).max(100).optional(),
  })
  .refine(
    (query) => Boolean(query.error) || Boolean(query.code && query.state),
  );

export type GoogleOAuthCallbackQuery = z.infer<
  typeof googleOAuthCallbackQuerySchema
>;
