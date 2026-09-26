import { PgBoss } from "pg-boss";

import { env } from "./config/env.js";
import { EMAIL_VERIFICATION_QUEUE } from "./modules/jobs/email-verification.job.js";

const boss = new PgBoss(env.DATABASE_URL);
await boss.start();
try {
  await boss.createQueue(EMAIL_VERIFICATION_QUEUE);
} finally {
  await boss.stop();
}
