import {prisma} from "../../core/database/prisma.js";
import {ApiError} from "../../core/http/api-error.js";
import {hashPassword} from "../../core/security/password.js";
import {assertStrongPassword} from "../users/password/password.policy.js";
import {jobProducer} from "../jobs/producers/job.producer.js";
import {challengeService} from "./challenges/challenge.service.js";

const verificationMinutes=20;

export const registrationService={
  async register(email:string,password:string,displayName:string|undefined,baseUrl:string){
    assertStrongPassword(password);
    if(await prisma.user.findUnique({where:{email}}))throw new ApiError(409,"EMAIL_ALREADY_EXISTS","Email đã được đăng ký");
    const user=await prisma.user.create({data:{email,displayName,passwordCredential:{create:{passwordHash:await hashPassword(password)}}}});
    const token=await challengeService.issue(email,"EMAIL_VERIFY",user.id,verificationMinutes);
    const actionUrl=`${baseUrl}/api/v1/auth/register/verify?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
    await jobProducer.send("mail.send",{kind:"auth",templateId:"magic-link",to:email,title:"Xác minh địa chỉ email",message:"Nhấn nút bên dưới để kích hoạt tài khoản của bạn.",actionUrl,actionLabel:"Xác minh email",expiresIn:`${verificationMinutes} phút`});
    return{accepted:true,expiresInMinutes:verificationMinutes};
  },
  async verify(email:string,token:string){const challenge=await challengeService.verify(email,"EMAIL_VERIFY",token);await prisma.user.update({where:{id:challenge.userId!},data:{emailVerifiedAt:new Date()}})}
};
