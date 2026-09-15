import { prisma } from "../../../core/database/prisma.js"; export const authCleanupJob=()=>prisma.verificationChallenge.deleteMany({where:{OR:[{expiresAt:{lt:new Date()}},{consumedAt:{not:null}}]}});
