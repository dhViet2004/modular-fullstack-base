import type { Request,RequestHandler } from "express";
import { prisma } from "../../core/database/prisma.js";
import { success } from "../../core/http/api-response.js";
import { AuditAction } from "../audit/audit.constants.js";
import { auditService } from "../audit/audit.service.js";
import { jobProducer } from "../jobs/producers/job.producer.js";
import { authService } from "./auth.service.js";
import { challengeService } from "./challenges/challenge.service.js";
import { sessionRepository } from "./sessions/session.repository.js";
import { sessionService } from "./sessions/session.service.js";
import { magicLinkStrategy } from "./strategies/magic-link.strategy.js";
import { otpStrategy } from "./strategies/otp.strategy.js";
import { passwordStrategy } from "./strategies/password.strategy.js";

const info=(req:Request)=>({ipAddress:req.ip,userAgent:req.header("user-agent"),fingerprint:req.body?.fingerprint??req.query.fingerprint as string|undefined});
export const authController:Record<string,RequestHandler>={
  async login(req,res,next){try{res.json(success(await authService.complete(await passwordStrategy.authenticate(req.body.email,req.body.password),info(req))))}catch(error){await auditService.record({action:AuditAction.LOGIN_FAILED,entityType:"Auth",metadata:{method:"PASSWORD"},ipAddress:req.ip,userAgent:req.header("user-agent")});next(error)}},
  async requestOtp(req,res,next){try{const user=await prisma.user.findUnique({where:{email:req.body.email}});const otp=await challengeService.issue(req.body.email,"LOGIN_OTP",user?.id);await jobProducer.send("mail.send",{kind:"auth",templateId:"otp",to:req.body.email,title:"Xác thực đăng nhập",message:"Dùng mã sau để hoàn tất đăng nhập.",otp,expiresIn:"10 phút"});res.json(success({accepted:true}))}catch(error){next(error)}},
  async verifyOtp(req,res,next){try{res.json(success(await authService.complete(await otpStrategy.authenticate(req.body.email,req.body.otp),info(req))))}catch(error){next(error)}},
  async requestMagic(req,res,next){try{const user=await prisma.user.findUnique({where:{email:req.body.email}});const token=await challengeService.issue(req.body.email,"MAGIC_LINK",user?.id);const actionUrl=`${req.protocol}://${req.get("host")}/api/v1/auth/magic-link/verify?email=${encodeURIComponent(req.body.email)}&token=${encodeURIComponent(token)}`;await jobProducer.send("mail.send",{kind:"auth",templateId:"magic-link",to:req.body.email,title:"Đăng nhập an toàn",message:"Nhấn nút bên dưới để đăng nhập.",actionUrl,actionLabel:"Đăng nhập",expiresIn:"10 phút"});res.json(success({accepted:true}))}catch(error){next(error)}},
  async verifyMagic(req,res,next){try{res.json(success(await authService.complete(await magicLinkStrategy.authenticate(String(req.query.email),String(req.query.token)),info(req))))}catch(error){next(error)}},
  async refresh(req,res,next){try{res.json(success(await sessionService.refresh(req.body.sessionId,req.body.refreshToken)))}catch(error){next(error)}},
  async logout(_req,res,next){try{await sessionRepository.revoke(res.locals.auth.sessionId);await auditService.record({actorUserId:res.locals.auth.userId,action:AuditAction.LOGOUT,entityType:"Session",entityId:res.locals.auth.sessionId});res.json(success({loggedOut:true}))}catch(error){next(error)}},
  async logoutAll(_req,res,next){try{await sessionRepository.revokeAll(res.locals.auth.userId);await auditService.record({actorUserId:res.locals.auth.userId,action:AuditAction.LOGOUT,entityType:"Session",metadata:{all:true}});res.json(success({loggedOut:true}))}catch(error){next(error)}},
  async sessions(_req,res,next){try{res.json(success(await sessionRepository.list(res.locals.auth.userId)))}catch(error){next(error)}},
  async revoke(req,res,next){try{const id=String(req.params.sessionId);const target=await prisma.session.findFirst({where:{id,userId:res.locals.auth.userId}});if(target){await sessionRepository.revoke(target.id);await auditService.record({actorUserId:res.locals.auth.userId,action:AuditAction.SESSION_REVOKED,entityType:"Session",entityId:target.id})}res.json(success({revoked:Boolean(target)}))}catch(error){next(error)}}
};
