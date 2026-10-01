import { PgBoss } from "pg-boss";

import { env } from "../../config/env.js";
import { ApplicationError } from "../../core/http/application-error.js";
import { requestEmailVerification } from "../auth/email-verification/email-verification.service.js";
import { isEmailVerificationEnabled } from "../system/system.service.js";

export const EMAIL_VERIFICATION_QUEUE = "email-verification";

const boss = new PgBoss({
  connectionString: env.DATABASE_URL,
  migrate: false,
  createSchema: false,
  supervise: false,
  schedule: false,
});
boss.on("error", () => console.error("Email verification queue error"));

let started: Promise<PgBoss> | undefined;

function getBoss() {
  started ??= boss.start().catch((error: unknown) => {
    started = undefined;
    throw error;
  });
  return started;
}

export async function stopEmailVerificationQueue() {
  if (started) await (await started).stop();
}

export async function enqueueEmailVerification(userId: string) {
  if (!(await isEmailVerificationEnabled())) return { accepted: false, disabled: true };
  try {
    const jobId = await (
      await getBoss()
    ).send(
      EMAIL_VERIFICATION_QUEUE,
      { userId },
      {
        singletonKey: userId,
        singletonSeconds: 60,
        retryLimit: 3,
        retryDelay: 10,
      },
    );
    if (!jobId)
      throw new ApplicationError(
        429,
        "EMAIL_VERIFICATION_RATE_LIMITED",
        "Vui lòng chờ trước khi yêu cầu gửi lại email xác minh",
      );
    return { accepted: true };
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    throw new ApplicationError(
      503,
      "EMAIL_DELIVERY_UNAVAILABLE",
      "Dịch vụ gửi email tạm thời không khả dụng",
    );
  }
}

export async function processEmailVerificationJob(data: unknown) {
  if (!(await isEmailVerificationEnabled())) return;
  if (
    !data ||
    typeof data !== "object" ||
    !("userId" in data) ||
    typeof data.userId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      data.userId,
    )
  ) {
    throw new Error("Invalid email verification job");
  }

  try {
    await requestEmailVerification(
      data.userId,
      { ipAddress: null, userAgent: null },
      null,
    );
  } catch (error) {
    // A retry after successful delivery must not send a second email.
    if (
      error instanceof ApplicationError &&
      error.code === "EMAIL_VERIFICATION_RATE_LIMITED"
    )
      return;
    throw error;
  }
}

export async function startEmailVerificationWorker() {
  const workerBoss = new PgBoss({
    connectionString: env.DATABASE_URL,
    migrate: false,
    createSchema: false,
    schedule: false,
  });
  workerBoss.on("error", () =>
    console.error("Email verification worker queue error"),
  );
  await workerBoss.start();
  await workerBoss.work<{ userId: string }>(
    EMAIL_VERIFICATION_QUEUE,
    async (jobs) => {
      for (const job of jobs) await processEmailVerificationJob(job.data);
    },
  );
  return workerBoss;
}
