import { prisma } from "../../../core/database/prisma.js"; export const sessionCleanupJob=()=>prisma.session.deleteMany({where:{expiresAt:{lt:new Date()}}});
