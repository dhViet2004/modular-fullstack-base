import { prisma } from "../../core/database/prisma.js"; import type { Prisma } from "../../generated/prisma/client.js"; import type { AuditInput } from "./audit.types.js";
export const auditRepository={create:(input:AuditInput)=>prisma.auditLog.create({data:{...input,metadata:(input.metadata??{}) as Prisma.InputJsonValue}})};
