import { prisma } from "../../core/database/prisma.js";
import type { Prisma, JobTaskType } from "../../generated/prisma/client.js";

export const scheduledJobRepository = {
  list: () =>
    prisma.scheduledJob.findMany({
      orderBy: { createdAt: "desc" }
    }),

  listEnabled: () =>
    prisma.scheduledJob.findMany({
      where: { enabled: true },
      orderBy: { createdAt: "asc" }
    }),

  findById: (id: string) =>
    prisma.scheduledJob.findUnique({
      where: { id }
    }),

  findByName: (name: string) =>
    prisma.scheduledJob.findFirst({
      where: { name }
    }),

  create: (data: {
    name: string;
    description?: string | null;
    taskType: JobTaskType;
    queue: string;
    cron: string;
    payload?: Prisma.InputJsonValue;
    enabled?: boolean;
    runOnServer?: boolean;
  }) =>
    prisma.scheduledJob.create({
      data
    }),

  update: (
    id: string,
    data: {
      name?: string;
      description?: string | null;
      taskType?: JobTaskType;
      queue?: string;
      cron?: string;
      payload?: Prisma.InputJsonValue;
      enabled?: boolean;
      runOnServer?: boolean;
      lastRunAt?: Date | null;
      lastStatus?: string | null;
      lastError?: string | null;
    }
  ) =>
    prisma.scheduledJob.update({
      where: { id },
      data
    }),

  delete: (id: string) =>
    prisma.scheduledJob.delete({
      where: { id }
    }),

  recordRunResult: (id: string, status: "SUCCESS" | "FAILED", error?: string | null) =>
    prisma.scheduledJob.update({
      where: { id },
      data: {
        lastRunAt: new Date(),
        lastStatus: status,
        lastError: error ?? null
      }
    })
};
