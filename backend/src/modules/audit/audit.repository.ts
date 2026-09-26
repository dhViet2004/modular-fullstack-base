import { prisma } from "../../core/database/prisma.js";
import type {
  AuditAction,
  AuditOutcome,
  AuditSubjectType,
} from "./audit.catalog.js";

export type CreateAuditLogData = {
  action: AuditAction;
  outcome: AuditOutcome;
  actorUserId: string | null;
  subjectType: AuditSubjectType | null;
  subjectId: string | null;
  sessionId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
};

export type FindAuditLogsInput = {
  limit: number;
  action?: AuditAction;
  actorUserId?: string;
  cursor?: {
    createdAt: Date;
    id: string;
  };
};

// Ghi một audit event mới; repository cố ý không cung cấp update hoặc delete.
export function createAuditLog(data: CreateAuditLogData) {
  return prisma.auditLog.create({ data });
}

// Đọc timeline theo cursor (createdAt, id), mới nhất trước và lấy dư một bản ghi.
export function findAuditLogs(input: FindAuditLogsInput) {
  return prisma.auditLog.findMany({
    where: {
      ...(input.action ? { action: input.action } : {}),
      ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
      ...(input.cursor
        ? {
            OR: [
              { createdAt: { lt: input.cursor.createdAt } },
              {
                createdAt: input.cursor.createdAt,
                id: { lt: input.cursor.id },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: input.limit + 1,
  });
}
