import {afterAll,beforeEach,describe,expect,it} from "vitest";
import request from "supertest";
import {createApp} from "../../src/app.js";
import {prisma} from "../../src/core/database/prisma.js";
import {sha256} from "../../src/core/security/hashing.js";
import {hashPassword} from "../../src/core/security/password.js";

const app=createApp();
const email="registration-test@example.com";

beforeEach(async()=>{await prisma.verificationChallenge.deleteMany({where:{email}});await prisma.session.deleteMany({where:{user:{email}}});await prisma.passwordCredential.deleteMany({where:{user:{email}}});await prisma.user.deleteMany({where:{email}})});
afterAll(()=>prisma.$disconnect());

describe("email/password registration",()=>{
  it("creates an unverified account and blocks password login",async()=>{
    const response=await request(app).post("/api/v1/auth/register").send({email,password:"StrongPassword123",displayName:"Test User"});
    expect(response.status).toBe(201);
    expect(response.body.data.expiresInMinutes).toBe(20);
    const user=await prisma.user.findUniqueOrThrow({where:{email}});
    expect(user.emailVerifiedAt).toBeNull();
    const login=await request(app).post("/api/v1/auth/login").send({email,password:"StrongPassword123"});
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("verifies once then rejects reuse of the same email link",async()=>{
    const user=await prisma.user.create({data:{email,passwordCredential:{create:{passwordHash:await hashPassword("StrongPassword123")}}}});
    const token="single-use-email-verification-token";
    await prisma.verificationChallenge.create({data:{email,userId:user.id,type:"EMAIL_VERIFY",tokenHash:sha256(token),expiresAt:new Date(Date.now()+20*60_000)}});
    const first=await request(app).get("/api/v1/auth/register/verify").query({email,token});
    expect(first.status).toBe(302);
    expect(first.headers.location).toContain("/register/verified?success=1");
    expect((await prisma.user.findUniqueOrThrow({where:{email}})).emailVerifiedAt).not.toBeNull();
    const reused=await request(app).get("/api/v1/auth/register/verify").query({email,token});
    expect(reused.status).toBe(302);
    expect(reused.headers.location).toContain("error=invalid_or_expired");
  });

  it("rejects an expired verification link",async()=>{
    const user=await prisma.user.create({data:{email,passwordCredential:{create:{passwordHash:await hashPassword("StrongPassword123")}}}});
    const token="expired-email-verification-token";
    await prisma.verificationChallenge.create({data:{email,userId:user.id,type:"EMAIL_VERIFY",tokenHash:sha256(token),expiresAt:new Date(0)}});
    const response=await request(app).get("/api/v1/auth/register/verify").query({email,token});
    expect(response.headers.location).toContain("error=invalid_or_expired");
  });
});
