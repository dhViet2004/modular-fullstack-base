import { jobService } from "./job.service.js";
import { jobsConfig } from "../../config/jobs.config.js";
import { mailSendJob } from "./handlers/mail-send.job.js";
import { authCleanupJob } from "./handlers/auth-cleanup.job.js";
import { sessionCleanupJob } from "./handlers/session-cleanup.job.js";
import { fileCleanupJob } from "./handlers/file-cleanup.job.js";
import { markdownImportJob } from "./handlers/markdown-import.job.js";
import { markdownExportJob } from "./handlers/markdown-export.job.js";
import { cleanupAuditLogsJob, updateInactiveUsersJob } from "./handlers/maintenance.job.js";
import { logger } from "../../core/logger/logger.js";

export const registerJobs = async () => {
  for (const name of Object.values(jobsConfig.queues)) {
    await jobService.boss.createQueue(name);
  }

  await jobService.boss.work("mail.send", mailSendJob);
  await jobService.boss.work("auth.cleanup-challenges", async () => { await authCleanupJob(); });
  await jobService.boss.work("sessions.cleanup-expired", async () => { await sessionCleanupJob(); });
  await jobService.boss.work("files.cleanup-orphans", async () => { await fileCleanupJob(); });
  await jobService.boss.work("files.import-markdown", markdownImportJob);
  await jobService.boss.work("files.export-markdown", markdownExportJob);
  await jobService.boss.work("system.cleanup-audit", async (job) => {
    const data = (job && typeof job === "object" && "data" in job) ? job.data : {};
    return cleanupAuditLogsJob(data as Record<string, unknown>);
  });
  await jobService.boss.work("users.update-inactive", async (job) => {
    const data = (job && typeof job === "object" && "data" in job) ? job.data : {};
    return updateInactiveUsersJob(data as Record<string, unknown>);
  });
  await jobService.boss.work("system.custom-task", async (job) => {
    logger.info("[Job:custom-task] Thực thi tác vụ tùy chỉnh:", job);
    return { executed: true, at: new Date() };
  });
};
