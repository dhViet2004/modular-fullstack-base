import {z} from "zod";export const sendMailSchema=z.object({body:z.object({to:z.string().email(),subject:z.string().trim().min(1).max(180),message:z.string().trim().min(1).max(20000)})});
