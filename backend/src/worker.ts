import { startEmailVerificationWorker } from "./modules/jobs/email-verification.job.js";
import { prisma } from "./core/database/prisma.js";

const boss = await startEmailVerificationWorker();

async function shutdown() {
  await boss.stop();
  await prisma.$disconnect();
}

process.on("SIGINT", () => {
  void shutdown().then(() => process.exit(0));
});
process.on("SIGTERM", () => {
  void shutdown().then(() => process.exit(0));
});
