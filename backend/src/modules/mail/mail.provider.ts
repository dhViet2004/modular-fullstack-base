import type { RenderedMail } from "./mail.types.js"; export interface MailProvider{send(to:string,mail:RenderedMail):Promise<void>}
