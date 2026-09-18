import {afterAll,beforeEach,describe,expect,it} from "vitest";
import {prisma} from "../../src/core/database/prisma.js";
import {hashPassword} from "../../src/core/security/password.js";
import {identityService} from "../../src/modules/auth/identities/identity.service.js";

const email="google-identity-sync@example.com";
const googleIdentity={provider:"GOOGLE" as const,providerAccountId:"google-sync-sub",email,emailVerified:true,displayName:"Google User",avatarUrl:"https://example.com/avatar.png"};

beforeEach(async()=>{
  await prisma.user.deleteMany({where:{OR:[{email},{identities:{some:{provider:"GOOGLE",providerAccountId:googleIdentity.providerAccountId}}}]}});
});
afterAll(()=>prisma.$disconnect());

describe("Google identity synchronization",()=>{
  it("creates a user and persists Google identity on first login",async()=>{
    const first=await identityService.resolve(googleIdentity);
    const linked=await prisma.authIdentity.findUniqueOrThrow({where:{provider_providerAccountId:{provider:"GOOGLE",providerAccountId:googleIdentity.providerAccountId}}});
    expect(linked.userId).toBe(first.id);
    expect(first.emailVerifiedAt).not.toBeNull();
    expect(first.displayName).toBe("Google User");
  });

  it("returns the same user on later Google logins by immutable subject",async()=>{
    const first=await identityService.resolve(googleIdentity);
    const second=await identityService.resolve({...googleIdentity,email:"changed-google-email@example.com",displayName:"Updated Google User"});
    expect(second.id).toBe(first.id);
    expect(second.email).toBe(email);
    expect(second.displayName).toBe("Updated Google User");
  });

  it("links verified Google login to an existing password account",async()=>{
    const existing=await prisma.user.create({data:{email,passwordCredential:{create:{passwordHash:await hashPassword("StrongPassword123")}}}});
    const resolved=await identityService.resolve(googleIdentity);
    expect(resolved.id).toBe(existing.id);
    expect(resolved.emailVerifiedAt).not.toBeNull();
    expect(await prisma.authIdentity.count({where:{userId:existing.id,provider:"GOOGLE"}})).toBe(1);
    expect(await prisma.user.count({where:{email}})).toBe(1);
  });
});
