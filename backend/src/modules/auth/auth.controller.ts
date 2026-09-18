import type { Request,RequestHandler } from "express";
import { env } from "../../config/env.js";
import { prisma } from "../../core/database/prisma.js";
import { success } from "../../core/http/api-response.js";
import { AuditAction } from "../audit/audit.constants.js";
import { auditService } from "../audit/audit.service.js";
import { jobProducer } from "../jobs/producers/job.producer.js";
import { oauthHandoffService } from "../oauth/oauth-handoff.service.js";
import { authService } from "./auth.service.js";
import { challengeService } from "./challenges/challenge.service.js";
import { sessionRepository } from "./sessions/session.repository.js";
import { sessionService } from "./sessions/session.service.js";
import { magicLinkStrategy } from "./strategies/magic-link.strategy.js";
import { otpStrategy } from "./strategies/otp.strategy.js";
import { passwordStrategy } from "./strategies/password.strategy.js";
import { registrationService } from "./registration.service.js";
import {passwordResetService} from "./password-reset.service.js";

const info=(req:Request)=>({ipAddress:req.ip,userAgent:req.header("user-agent"),fingerprint:req.body?.fingerprint??req.query.fingerprint as string|undefined});
export const authController:Record<string,RequestHandler>={
  async register(req,res,next){try{const baseUrl=`${req.protocol}://${req.get("host")}`;res.status(201).json(success(await registrationService.register(req.body.email,req.body.password,req.body.displayName,baseUrl)))}catch(error){next(error)}},
  async verifyRegistration(req,res){try{await registrationService.verify(String(req.query.email),String(req.query.token));res.redirect(`${env.FRONTEND_URL}/register/verified?success=1`)}catch{res.redirect(`${env.FRONTEND_URL}/register/verified?error=invalid_or_expired`)}},
  async login(req,res,next){try{res.json(success(await authService.complete(await passwordStrategy.authenticate(req.body.email,req.body.password),info(req))))}catch(error){await auditService.record({action:AuditAction.LOGIN_FAILED,entityType:"Auth",metadata:{method:"PASSWORD"},ipAddress:req.ip,userAgent:req.header("user-agent")});next(error)}},
  async requestOtp(req,res,next){try{const user=await prisma.user.findUnique({where:{email:req.body.email}});const otp=await challengeService.issue(req.body.email,"LOGIN_OTP",user?.id);await jobProducer.send("mail.send",{kind:"auth",templateId:"otp",to:req.body.email,title:"Xác thực đăng nhập",message:"Dùng mã sau để hoàn tất đăng nhập.",otp,expiresIn:"10 phút"});res.json(success({accepted:true}))}catch(error){next(error)}},
  async verifyOtp(req,res,next){try{res.json(success(await authService.complete(await otpStrategy.authenticate(req.body.email,req.body.otp),info(req))))}catch(error){next(error)}},
  async requestPasswordReset(req,res,next){try{res.json(success(await passwordResetService.request(req.body.email)))}catch(error){next(error)}},
  async confirmPasswordReset(req,res,next){try{res.json(success(await passwordResetService.confirm(req.body.email,req.body.otp,req.body.password)))}catch(error){next(error)}},
  async requestMagic(req,res,next){try{const user=await prisma.user.findUnique({where:{email:req.body.email}});const token=await challengeService.issue(req.body.email,"MAGIC_LINK",user?.id);const actionUrl=`${req.protocol}://${req.get("host")}/api/v1/auth/magic-link/verify?email=${encodeURIComponent(req.body.email)}&token=${encodeURIComponent(token)}`;await jobProducer.send("mail.send",{kind:"auth",templateId:"magic-link",to:req.body.email,title:"Đăng nhập an toàn",message:"Nhấn nút bên dưới để đăng nhập.",actionUrl,actionLabel:"Đăng nhập",expiresIn:"10 phút"});res.json(success({accepted:true}))}catch(error){next(error)}},
  async verifyMagic(req,res){try{const result=await authService.complete(await magicLinkStrategy.authenticate(String(req.query.email),String(req.query.token)),info(req));const code=oauthHandoffService.issue(result);res.redirect(`${env.FRONTEND_URL}/auth/magic-link/callback?code=${encodeURIComponent(code)}`)}catch{res.redirect(`${env.FRONTEND_URL}/auth/magic-link/callback?error=magic_link_failed`)}},
  exchangeMagic(req,res,next){try{res.json(success(oauthHandoffService.consume(req.body.code)))}catch(error){next(error)}},
  async refresh(req,res,next){try{res.json(success(await sessionService.refresh(req.body.sessionId,req.body.refreshToken)))}catch(error){next(error)}},
  async logout(_req,res,next){try{await sessionRepository.revoke(res.locals.auth.sessionId);await auditService.record({actorUserId:res.locals.auth.userId,action:AuditAction.LOGOUT,entityType:"Session",entityId:res.locals.auth.sessionId});res.json(success({loggedOut:true}))}catch(error){next(error)}},
  async logoutAll(_req,res,next){try{await sessionRepository.revokeAll(res.locals.auth.userId);await auditService.record({actorUserId:res.locals.auth.userId,action:AuditAction.LOGOUT,entityType:"Session",metadata:{all:true}});res.json(success({loggedOut:true}))}catch(error){next(error)}},
  async sessions(_req,res,next){try{res.json(success(await sessionRepository.list(res.locals.auth.userId)))}catch(error){next(error)}},
  async revoke(req,res,next){try{const id=String(req.params.sessionId);const target=await prisma.session.findFirst({where:{id,userId:res.locals.auth.userId}});if(target){await sessionRepository.revoke(target.id);await auditService.record({actorUserId:res.locals.auth.userId,action:AuditAction.SESSION_REVOKED,entityType:"Session",entityId:target.id})}res.json(success({revoked:Boolean(target)}))}catch(error){next(error)}}
};
