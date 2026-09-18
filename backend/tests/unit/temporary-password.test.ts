import { describe, it, expect, vi, beforeEach } from "vitest";
import { userService } from "../../src/modules/users/user.service.js";
import { passwordStrategy } from "../../src/modules/auth/strategies/password.strategy.js";
import { passwordService } from "../../src/modules/users/password/password.service.js";
import { prisma } from "../../src/core/database/prisma.js";
import { userRepository } from "../../src/modules/users/user.repository.js";
import { sessionRepository } from "../../src/modules/auth/sessions/session.repository.js";
import { auditService } from "../../src/modules/audit/audit.service.js";
import { jobProducer } from "../../src/modules/jobs/producers/job.producer.js";
import * as passwordUtils from "../../src/core/security/password.js";

vi.mock("../../src/core/database/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    passwordCredential: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock("../../src/modules/users/user.repository.js", () => ({
  userRepository: {
    maxRank: vi.fn()
  }
}));

vi.mock("../../src/modules/auth/sessions/session.repository.js", () => ({
  sessionRepository: {
    revokeAll: vi.fn()
  }
}));

vi.mock("../../src/modules/audit/audit.service.js", () => ({
  auditService: {
    record: vi.fn()
  }
}));

vi.mock("../../src/modules/jobs/producers/job.producer.js", () => ({
  jobProducer: {
    send: vi.fn()
  }
}));

vi.mock("../../src/core/security/password.js", () => ({
  hashPassword: vi.fn().mockResolvedValue("mocked_hashed_password"),
  verifyPassword: vi.fn()
}));

describe("Temporary Password & Must Change Password Workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Admin/Super Admin Reset Password (Mật khẩu tạm 24h)", () => {
    it("prevents peer admin from resetting password of another admin (rank ngang nhau)", async () => {
      vi.mocked(userRepository.maxRank).mockImplementation(async (id: string) => {
        if (id === "admin1") return 50;
        if (id === "admin2") return 50;
        return 0;
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "admin2", email: "admin2@test.com" } as any);

      await expect(userService.resetUserPassword("admin1", "admin2")).rejects.toThrow(
        /Không thể thao tác trên tài khoản có cấp bậc tương đương hoặc cao hơn/
      );
    });

    it("allows higher rank to issue temporary password (24h) with mustChangePassword flag and revokes sessions", async () => {
      vi.mocked(userRepository.maxRank).mockImplementation(async (id: string) => {
        if (id === "superadmin") return 100;
        if (id === "target-user") return 10;
        return 0;
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "target-user", email: "target@test.com" } as any);
      vi.mocked(prisma.passwordCredential.upsert).mockResolvedValue({} as any);

      const res = await userService.resetUserPassword("superadmin", "target-user");

      expect(res.temporaryExpiresAt).toBeDefined();
      const expiresAt = new Date(res.temporaryExpiresAt).getTime();
      const expectedMinExpires = Date.now() + 23 * 60 * 60 * 1000;
      const expectedMaxExpires = Date.now() + 25 * 60 * 60 * 1000;
      expect(expiresAt).toBeGreaterThan(expectedMinExpires);
      expect(expiresAt).toBeLessThan(expectedMaxExpires);

      // Kiểm tra upsert mustChangePassword: true
      expect(prisma.passwordCredential.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "target-user" },
          create: expect.objectContaining({
            userId: "target-user",
            mustChangePassword: true
          }),
          update: expect.objectContaining({
            mustChangePassword: true
          })
        })
      );

      // Đã thu hồi toàn bộ session cũ
      expect(sessionRepository.revokeAll).toHaveBeenCalledWith("target-user");
      // Đã ghi log audit
      expect(auditService.record).toHaveBeenCalled();
      // Đã gửi mail thông báo mật khẩu tạm
      expect(jobProducer.send).toHaveBeenCalledWith("mail.send", expect.objectContaining({
        to: "target@test.com",
        title: expect.stringContaining("Mật khẩu tạm thời")
      }));
    });
  });

  describe("Password Strategy Temporary Expiration Check", () => {
    it("allows login when temporary password is valid and within 24h", async () => {
      const validUntil = new Date(Date.now() + 10 * 60 * 60 * 1000); // còn 10h
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        email: "user1@test.com",
        emailVerifiedAt: new Date(),
        passwordCredential: {
          passwordHash: "valid_hash",
          mustChangePassword: true,
          temporaryExpiresAt: validUntil
        }
      } as any);
      vi.mocked(passwordUtils.verifyPassword).mockResolvedValue(true);

      const result = await passwordStrategy.authenticate("user1@test.com", "any_temp_pass");
      expect(result.userId).toBe("user-1");
      expect(result.email).toBe("user1@test.com");
    });

    it("rejects login when temporary password has expired past 24h", async () => {
      const expiredAt = new Date(Date.now() - 1000); // đã quá hạn 1 giây
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        email: "user1@test.com",
        emailVerifiedAt: new Date(),
        passwordCredential: {
          passwordHash: "valid_hash",
          mustChangePassword: true,
          temporaryExpiresAt: expiredAt
        }
      } as any);
      vi.mocked(passwordUtils.verifyPassword).mockResolvedValue(true);

      await expect(passwordStrategy.authenticate("user1@test.com", "any_temp_pass")).rejects.toThrow(
        /Mật khẩu tạm thời đã hết hạn/
      );
    });
  });

  describe("Password Change clears mustChangePassword & temporaryExpiresAt", () => {
    it("resets mustChangePassword to false and clears temporaryExpiresAt after successful password change", async () => {
      vi.mocked(prisma.passwordCredential.findUnique).mockResolvedValue({
        userId: "user-1",
        passwordHash: "old_hash",
        user: { email: "user1@test.com" }
      } as any);
      vi.mocked(passwordUtils.verifyPassword).mockResolvedValue(true);
      vi.mocked(prisma.passwordCredential.update).mockResolvedValue({} as any);

      await passwordService.change("user-1", "OldPass123!@", "NewSecurePass123!@");

      expect(prisma.passwordCredential.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: expect.objectContaining({
          mustChangePassword: false,
          temporaryExpiresAt: null
        })
      });
    });
  });
});
