import {prisma} from "../../core/database/prisma.js";
import {hashPassword} from "../../core/security/password.js";
import {AuditAction} from "../audit/audit.constants.js";
import {auditService} from "../audit/audit.service.js";
import {jobProducer} from "../jobs/producers/job.producer.js";
import {assertStrongPassword} from "../users/password/password.policy.js";
import {challengeService} from "./challenges/challenge.service.js";
import {sessionRepository} from "./sessions/session.repository.js";

const resetMinutes=10;

export const passwordResetService={
  async request(email:string){
    const user=await prisma.user.findUnique({where:{email},include:{passwordCredential:true}});
    if(user?.passwordCredential){
      const otp=await challengeService.issue(email,"PASSWORD_RESET",user.id,resetMinutes);
      await jobProducer.send("mail.send",{kind:"auth",templateId:"otp",to:email,title:"Đặt lại mật khẩu",message:"Dùng mã sau để đặt lại mật khẩu của bạn.",otp,expiresIn:`${resetMinutes} phút`});
    }
    return{accepted:true,expiresInMinutes:resetMinutes};
  },
  async confirm(email:string,otp:string,password:string){
    assertStrongPassword(password);
    const challenge=await challengeService.verify(email,"PASSWORD_RESET",otp);
    if(!challenge.userId)throw new Error("Password reset challenge has no user");
    await prisma.passwordCredential.update({where:{userId:challenge.userId},data:{passwordHash:await hashPassword(password),passwordChangedAt:new Date()}});
    await sessionRepository.revokeAll(challenge.userId);
    await auditService.record({actorUserId:challenge.userId,action:AuditAction.PASSWORD_CHANGED,entityType:"User",entityId:challenge.userId,metadata:{method:"PASSWORD_RESET"}});
    return{reset:true};
  },
};
