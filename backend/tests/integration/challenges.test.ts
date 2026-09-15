import { afterAll,beforeEach,describe,expect,it } from "vitest";
import { prisma } from "../../src/core/database/prisma.js";
import { sha256 } from "../../src/core/security/hashing.js";
import { challengeService } from "../../src/modules/auth/challenges/challenge.service.js";
import request from "supertest";
import { createApp } from "../../src/app.js";

const email="challenge-test@example.com";
const app=createApp();
beforeEach(async()=>{await prisma.verificationChallenge.deleteMany({where:{email}});await prisma.session.deleteMany({where:{user:{email}}});await prisma.device.deleteMany({where:{user:{email}}});await prisma.authIdentity.deleteMany({where:{user:{email}}});await prisma.user.deleteMany({where:{email}})});
afterAll(()=>prisma.$disconnect());

describe("one-time verification challenges",()=>{
  it("rejects an expired OTP",async()=>{
    await prisma.verificationChallenge.create({data:{email,type:"LOGIN_OTP",tokenHash:sha256("123456"),expiresAt:new Date(0)}});
    await expect(challengeService.verify(email,"LOGIN_OTP","123456")).rejects.toMatchObject({code:"OTP_EXPIRED"});
  });
  it("rejects a consumed OTP",async()=>{
    await prisma.verificationChallenge.create({data:{email,type:"LOGIN_OTP",tokenHash:sha256("123456"),expiresAt:new Date(Date.now()+60_000),consumedAt:new Date()}});
    await expect(challengeService.verify(email,"LOGIN_OTP","123456")).rejects.toMatchObject({code:"OTP_INVALID"});
  });
  it("consumes a magic link exactly once",async()=>{
    const token="a-secure-magic-link-token";
    await prisma.verificationChallenge.create({data:{email,type:"MAGIC_LINK",tokenHash:sha256(token),expiresAt:new Date(Date.now()+60_000)}});
    await expect(challengeService.verify(email,"MAGIC_LINK",token)).resolves.toMatchObject({email});
    await expect(challengeService.verify(email,"MAGIC_LINK",token)).rejects.toMatchObject({code:"MAGIC_LINK_INVALID"});
  });
  it("rejects an expired magic link",async()=>{
    await prisma.verificationChallenge.create({data:{email,type:"MAGIC_LINK",tokenHash:sha256("expired-token"),expiresAt:new Date(0)}});
    await expect(challengeService.verify(email,"MAGIC_LINK","expired-token")).rejects.toMatchObject({code:"MAGIC_LINK_EXPIRED"});
  });
  it("routes OTP through the common identity/session pipeline",async()=>{
    await prisma.verificationChallenge.create({data:{email,type:"LOGIN_OTP",tokenHash:sha256("654321"),expiresAt:new Date(Date.now()+60_000)}});
    const response=await request(app).post("/api/v1/auth/otp/verify").send({email,otp:"654321"});
    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(email);
    expect(await prisma.authIdentity.findFirst({where:{provider:"EMAIL_OTP",providerAccountId:email}})).not.toBeNull();
  });
  it("routes magic link through the common identity/session pipeline",async()=>{
    const token="route-magic-link-token";
    await prisma.verificationChallenge.create({data:{email,type:"MAGIC_LINK",tokenHash:sha256(token),expiresAt:new Date(Date.now()+60_000)}});
    const response=await request(app).get("/api/v1/auth/magic-link/verify").query({email,token});
    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(email);
    expect(await prisma.authIdentity.findFirst({where:{provider:"MAGIC_LINK",providerAccountId:email}})).not.toBeNull();
  });
});
