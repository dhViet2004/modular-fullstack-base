import { superAdminBootstrapConfig } from "../../../config/auth.config.js";
import { prisma } from "../../../core/database/prisma.js";
import { AuditAction } from "../../audit/audit.constants.js";
import type { StrategyResult } from "../auth.types.js";

type BootstrapAllowlist={googleEmails:Set<string>;googleSubjects:Set<string>};

export const isEligibleForSuperAdminBootstrap=(result:StrategyResult,allowlist:BootstrapAllowlist=superAdminBootstrapConfig)=>
  result.provider==="GOOGLE"&&
  result.emailVerified&&
  (allowlist.googleSubjects.has(result.providerAccountId)||
    allowlist.googleEmails.has(result.email.trim().toLowerCase()));

export const superAdminBootstrapService={
  async bootstrapIfEligible(userId:string,result:StrategyResult){
    if(!superAdminBootstrapConfig.enabled||superAdminBootstrapConfig.provider!=="google"||!isEligibleForSuperAdminBootstrap(result))return false;

    return prisma.$transaction(async(tx)=>{
      // Serialize bootstrap attempts so BOOTSTRAP_ONCE cannot promote two users
      // when their OAuth callbacks arrive concurrently.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('super-admin-bootstrap'))`;
      const role=await tx.role.findUnique({where:{name:"SUPER_ADMIN"}});
      if(!role)return false;
      const alreadyAssigned=await tx.userRole.findUnique({where:{userId_roleId:{userId,roleId:role.id}}});
      if(alreadyAssigned)return false;
      if(superAdminBootstrapConfig.once&&await tx.userRole.count({where:{roleId:role.id}})>0)return false;
      await tx.userRole.create({data:{userId,roleId:role.id}});
      await tx.auditLog.create({data:{actorUserId:userId,action:AuditAction.SUPER_ADMIN_BOOTSTRAPPED,entityType:"User",entityId:userId,metadata:{provider:"GOOGLE",providerAccountId:result.providerAccountId,matchedBy:superAdminBootstrapConfig.googleSubjects.has(result.providerAccountId)?"subject":"email"}}});
      return true;
    });
  }
};
