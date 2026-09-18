import {z} from "zod";

const email=z.email().transform(value=>value.toLowerCase());
const strongPassword=z.string().min(12).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/);

export const passwordResetRequestSchema=z.object({email});
export const passwordResetConfirmSchema=z.object({
  email,
  otp:z.string().regex(/^\d{6}$/),
  password:strongPassword,
});
