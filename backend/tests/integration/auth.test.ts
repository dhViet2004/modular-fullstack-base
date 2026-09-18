import { afterAll,beforeEach,describe,expect,it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/core/database/prisma.js";
import { hashPassword } from "../../src/core/security/password.js";
import { oauthHandoffService } from "../../src/modules/oauth/oauth-handoff.service.js";

const app=createApp();
const email="auth-test@example.com";

async function createUser(status:"ACTIVE"|"BLOCKED"="ACTIVE"){
  const user=await prisma.user.create({data:{email,status,emailVerifiedAt:new Date(),passwordCredential:{create:{passwordHash:await hashPassword("ValidPassword123")}}}});
  return user;
}

beforeEach(async()=>{
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.device.deleteMany();
  await prisma.authIdentity.deleteMany();
  await prisma.passwordCredential.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany({where:{email}});
});
afterAll(()=>prisma.$disconnect());

describe("password and session auth",()=>{
  it("logs in and stores only a refresh hash",async()=>{
    await createUser();
    const response=await request(app).post("/api/v1/auth/login").send({email,password:"ValidPassword123"});
    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeTypeOf("string");
    expect(response.body.data.session).not.toHaveProperty("refreshTokenHash");
    const session=await prisma.session.findUniqueOrThrow({where:{id:response.body.data.session.id}});
    expect(session.refreshTokenHash).not.toBe(response.body.data.refreshToken);
    expect(session.refreshTokenHash).toHaveLength(64);
  });
  it("exchanges an OAuth handoff exactly once without exposing the refresh hash",async()=>{
    await createUser();
    const login=await request(app).post("/api/v1/auth/login").send({email,password:"ValidPassword123"}).expect(200);
    const code=oauthHandoffService.issue(login.body.data);
    const exchanged=await request(app).post("/api/v1/auth/google/exchange").send({code}).expect(200);
    expect(exchanged.body.data.accessToken).toBe(login.body.data.accessToken);
    expect(exchanged.body.data.session).not.toHaveProperty("refreshTokenHash");
    const reused=await request(app).post("/api/v1/auth/google/exchange").send({code});
    expect(reused.status).toBe(401);
    expect(reused.body.error.code).toBe("INVALID_OAUTH_HANDOFF");
  });
  it("returns the same generic error for an invalid password",async()=>{
    await createUser();
    const response=await request(app).post("/api/v1/auth/login").send({email,password:"WrongPassword123"});
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(await prisma.auditLog.findFirst({where:{action:"AUTH_LOGIN_FAILED"}})).not.toBeNull();
  });
  it("rejects a blocked user",async()=>{
    await createUser("BLOCKED");
    const response=await request(app).post("/api/v1/auth/login").send({email,password:"ValidPassword123"});
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ACCOUNT_BLOCKED");
  });
  it("enforces the configured active session limit",async()=>{
    await createUser();
    for(let i=0;i<5;i++)await request(app).post("/api/v1/auth/login").send({email,password:"ValidPassword123",fingerprint:`device-${i}`});
    const response=await request(app).post("/api/v1/auth/login").send({email,password:"ValidPassword123",fingerprint:"device-6"});
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("SESSION_LIMIT_REACHED");
  });
  it("rejects an invalid refresh token",async()=>{
    await createUser();
    const login=await request(app).post("/api/v1/auth/login").send({email,password:"ValidPassword123"});
    const response=await request(app).post("/api/v1/auth/refresh").send({sessionId:login.body.data.session.id,refreshToken:"invalid-refresh-token-value"});
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_REFRESH_TOKEN");
  });
  it("audits logout and explicit session revocation",async()=>{
    await createUser();
    const first=await request(app).post("/api/v1/auth/login").send({email,password:"ValidPassword123",fingerprint:"first"});
    const second=await request(app).post("/api/v1/auth/login").send({email,password:"ValidPassword123",fingerprint:"second"});
    await request(app).delete(`/api/v1/auth/sessions/${second.body.data.session.id}`).set("authorization",`Bearer ${first.body.data.accessToken}`).expect(200);
    await request(app).post("/api/v1/auth/logout").set("authorization",`Bearer ${first.body.data.accessToken}`).expect(200);
    expect(await prisma.auditLog.count({where:{action:"SESSION_REVOKED"}})).toBe(1);
    expect(await prisma.auditLog.count({where:{action:"AUTH_LOGOUT"}})).toBe(1);
  });
  it("rejects an access token immediately after its session is revoked",async()=>{
    await createUser();
    const login=await request(app).post("/api/v1/auth/login").send({email,password:"ValidPassword123"});
    await prisma.session.update({where:{id:login.body.data.session.id},data:{revokedAt:new Date()}});
    await request(app).get("/api/v1/auth/sessions").set("authorization",`Bearer ${login.body.data.accessToken}`).expect(401);
  });
});
