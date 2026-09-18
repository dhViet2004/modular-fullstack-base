import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanupAuditLogsJob, updateInactiveUsersJob } from "../../src/modules/jobs/handlers/maintenance.job.js";
import { jobService } from "../../src/modules/jobs/job.service.js";
import { scheduledJobRepository } from "../../src/modules/jobs/scheduled-job.repository.js";
import { prisma } from "../../src/core/database/prisma.js";

describe("Scheduled Jobs Module & Maintenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("cleanupAuditLogsJob", () => {
    it("deletes audit logs older than specified retention days", async () => {
      const deleteSpy = vi.spyOn(prisma.auditLog, "deleteMany").mockResolvedValue({ count: 12 } as never);

      const res = await cleanupAuditLogsJob({ retentionDays: 30 });

      expect(res.deleted).toBe(12);
      expect(deleteSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: expect.objectContaining({ lt: expect.any(Date) })
          }
        })
      );
      deleteSpy.mockRestore();
    });

    it("uses default 90 days when retentionDays is not provided", async () => {
      const deleteSpy = vi.spyOn(prisma.auditLog, "deleteMany").mockResolvedValue({ count: 0 } as never);

      const res = await cleanupAuditLogsJob();

      expect(res.deleted).toBe(0);
      expect(deleteSpy).toHaveBeenCalled();
      deleteSpy.mockRestore();
    });
  });

  describe("updateInactiveUsersJob", () => {
    it("updates inactive users status to targetStatus", async () => {
      const findSpy = vi.spyOn(prisma.user, "findMany").mockResolvedValue([
        { id: "u-1", email: "user1@example.com" },
        { id: "u-2", email: "user2@example.com" }
      ] as never);

      const updateSpy = vi.spyOn(prisma.user, "updateMany").mockResolvedValue({ count: 2 } as never);

      const res = await updateInactiveUsersJob({ inactiveDays: 60, targetStatus: "SUSPENDED" });

      expect(res.updated).toBe(2);
      expect(res.affectedUserIds).toEqual(["u-1", "u-2"]);
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: { in: ["u-1", "u-2"] } },
        data: { status: "SUSPENDED" }
      });

      findSpy.mockRestore();
      updateSpy.mockRestore();
    });

    it("handles case where no inactive users are found", async () => {
      const findSpy = vi.spyOn(prisma.user, "findMany").mockResolvedValue([] as never);
      const updateSpy = vi.spyOn(prisma.user, "updateMany").mockResolvedValue({ count: 0 } as never);

      const res = await updateInactiveUsersJob();

      expect(res.updated).toBe(0);
      expect(updateSpy).not.toHaveBeenCalled();

      findSpy.mockRestore();
      updateSpy.mockRestore();
    });
  });

  describe("jobService triggerNow and scheduling", () => {
    it("triggers job immediately by sending payload to the target queue", async () => {
      const mockJob = {
        id: "job-123",
        name: "Test Cleanup",
        queue: "files.cleanup-orphans",
        cron: "0 2 * * *",
        payload: { force: true }
      };

      const findSpy = vi.spyOn(scheduledJobRepository, "findById").mockResolvedValue(mockJob as never);
      const sendSpy = vi.spyOn(jobService, "send").mockResolvedValue("job-run-id" as never);
      const recordSpy = vi.spyOn(scheduledJobRepository, "recordRunResult").mockResolvedValue({} as never);

      const result = await jobService.triggerNow("job-123");

      expect(result.success).toBe(true);
      expect(sendSpy).toHaveBeenCalledWith("files.cleanup-orphans", { force: true });
      expect(recordSpy).toHaveBeenCalledWith("job-123", "SUCCESS");

      findSpy.mockRestore();
      sendSpy.mockRestore();
      recordSpy.mockRestore();
    });

    it("throws error when triggering non-existent job", async () => {
      const findSpy = vi.spyOn(scheduledJobRepository, "findById").mockResolvedValue(null as never);

      await expect(jobService.triggerNow("invalid-id")).rejects.toThrow("Lịch trình công việc không tồn tại");

      findSpy.mockRestore();
    });
  });
});
