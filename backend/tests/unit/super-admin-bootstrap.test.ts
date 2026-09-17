import { describe,expect,it } from "vitest";
import { isEligibleForSuperAdminBootstrap } from "../../src/modules/auth/bootstrap/super-admin-bootstrap.service.js";
import type { StrategyResult } from "../../src/modules/auth/auth.types.js";

const allowlist={googleEmails:new Set(["admin@example.com"]),googleSubjects:new Set(["google-sub-1"])};
const googleIdentity:StrategyResult={provider:"GOOGLE",providerAccountId:"other-sub",email:"user@example.com",emailVerified:true};

describe("super admin bootstrap eligibility",()=>{
  it("matches a verified Google identity by immutable subject",()=>{
    expect(isEligibleForSuperAdminBootstrap({...googleIdentity,providerAccountId:"google-sub-1"},allowlist)).toBe(true);
  });

  it("matches email case-insensitively",()=>{
    expect(isEligibleForSuperAdminBootstrap({...googleIdentity,email:" Admin@Example.com "},allowlist)).toBe(true);
  });

  it("rejects unverified email and non-Google providers",()=>{
    expect(isEligibleForSuperAdminBootstrap({...googleIdentity,email:"admin@example.com",emailVerified:false},allowlist)).toBe(false);
    expect(isEligibleForSuperAdminBootstrap({...googleIdentity,provider:"PASSWORD",email:"admin@example.com"},allowlist)).toBe(false);
  });
});
