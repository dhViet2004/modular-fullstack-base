import {z} from "zod";export const sendTemplateSchema=z.object({kind:z.enum(["otp","login-alert"]),to:z.string().email().transform(value=>value.toLowerCase())});
