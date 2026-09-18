import {afterAll,beforeEach,describe,expect,it} from "vitest";
import request from "supertest";
import {createApp} from "../../src/app.js";
import {prisma} from "../../src/core/database/prisma.js";
import {sha256} from "../../src/core/security/hashing.js";
import {hashPassword,verifyPassword} from "../../src/core/security/password.js";

const app=createApp();
const email="password-reset-test@example.com";

beforeEach(async()=>{await prisma.verificationChallenge.deleteMany({where:{email}});await prisma.session.deleteMany({where:{user:{email}}});await prisma.passwordCredential.deleteMany({where:{user:{email}}});await prisma.user.deleteMany({where:{email}})});
afterAll(()=>prisma.$disconnect());

describe("password reset with email OTP",()=>{
  it("does not disclose whether an email exists",async()=>{
    const response=await request(app).post("/api/v1/auth/password-reset/request").send({email});
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({accepted:true,expiresInMinutes:10});
  });

  it("changes the password and consumes the OTP once",async()=>{
    const user=await prisma.user.create({data:{email,emailVerifiedAt:new Date(),passwordCredential:{create:{passwordHash:await hashPassword("OldPassword123")}}}});
    await prisma.verificationChallenge.create({data:{email,userId:user.id,type:"PASSWORD_RESET",tokenHash:sha256("123456"),expiresAt:new Date(Date.now()+10*60_000)}});
    const first=await request(app).post("/api/v1/auth/password-reset/confirm").send({email,otp:"123456",password:"NewPassword123"});
    expect(first.status).toBe(200);
    expect(first.body.data.reset).toBe(true);
    const credential=await prisma.passwordCredential.findUniqueOrThrow({where:{userId:user.id}});
    expect(await verifyPassword(credential.passwordHash,"NewPassword123")).toBe(true);
    const reused=await request(app).post("/api/v1/auth/password-reset/confirm").send({email,otp:"123456",password:"AnotherPassword123"});
    expect(reused.status).toBe(401);
    expect(reused.body.error.code).toBe("PASSWORD_RESET_INVALID");
  });
});
