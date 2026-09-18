import { createApp } from "./app.js";
import { appConfig } from "./config/app.config.js";
import { prisma } from "./core/database/prisma.js";
import { logger } from "./core/logger/logger.js";
import { jobService } from "./modules/jobs/job.service.js";
import { registerJobs } from "./modules/jobs/job.registry.js";
import { registerSchedules } from "./modules/jobs/schedules/schedules.js";

const app = createApp();

const server = app.listen(appConfig.port, async () => {
  logger.info(`API server listening on port ${appConfig.port}`);
  try {
    await jobService.start();
    await registerJobs();
    await registerSchedules();
    logger.info("Job Scheduler & Workers đã khởi động thành công cùng Server");
  } catch (err) {
    logger.error("Không thể khởi động Job Scheduler trên Server:", err);
  }
});

const stop = () =>
  server.close(async () => {
    try {
      await jobService.stop();
      await prisma.$disconnect();
    } catch {
      // Ignored during shutdown
    }
    process.exit(0);
  });

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
