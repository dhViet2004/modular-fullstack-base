import {prisma} from "../../../core/database/prisma.js";
import {ApiError} from "../../../core/http/api-error.js";
import {identityRepository} from "./identity.repository.js";
import type {StrategyResult} from "../auth.types.js";

const profile=(result:StrategyResult)=>result.provider==="GOOGLE"
  ? {displayName:result.displayName,avatarUrl:result.avatarUrl}
  : {};

export const identityService={
  async resolve(result:StrategyResult){
    const found=await identityRepository.find(result.provider,result.providerAccountId);
    if(found)return prisma.user.update({where:{id:found.userId},data:profile(result)});
    if(result.userId)return prisma.user.findUniqueOrThrow({where:{id:result.userId}});
    if(!result.emailVerified)throw new ApiError(401,"UNAUTHORIZED","Verified identity required");

    const email=result.email.trim().toLowerCase();
    return prisma.$transaction(async tx=>{
      const user=await tx.user.upsert({
        where:{email},
        update:{...profile(result),emailVerifiedAt:new Date()},
        create:{email,emailVerifiedAt:new Date(),...profile(result)},
      });
      await tx.authIdentity.upsert({
        where:{provider_providerAccountId:{provider:result.provider,providerAccountId:result.providerAccountId}},
        update:{providerEmail:email,providerEmailVerified:true},
        create:{userId:user.id,provider:result.provider,providerAccountId:result.providerAccountId,providerEmail:email,providerEmailVerified:true},
      });
      return user;
    });
  },
};
