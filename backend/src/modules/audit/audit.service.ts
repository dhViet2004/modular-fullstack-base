import { isIP } from "node:net";
import { z } from "zod";

import { ApplicationError } from "../../core/http/application-error.js";
import type {
  AuditAction,
  AuditOutcome,
  AuditSubjectType,
} from "./audit.catalog.js";
import { createAuditLog, findAuditLogs } from "./audit.repository.js";
import type { ListAuditLogsQuery } from "./audit.schema.js";

export type RecordAuditEventInput = {
  action: AuditAction;
  outcome: AuditOutcome;
  actorUserId?: string | null;
  subjectType?: AuditSubjectType | null;
  subjectId?: string | null;
  sessionId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AuditRequestContext = {
  ipAddress: string | null;
  userAgent: string | null;
};

function normalizeIpAddress(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized && isIP(normalized) ? normalized : null;
}

function normalizeUserAgent(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 512) : null;
}

export function normalizeAuditRequestContext(context: {
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  return {
    ipAddress: normalizeIpAddress(context.ipAddress),
    userAgent: normalizeUserAgent(context.userAgent),
  };
}

// Chuẩn hóa context không tin cậy rồi ghi event; caller không thể truyền metadata tùy ý.
export function recordAuditEvent(input: RecordAuditEventInput) {
  const context = normalizeAuditRequestContext(input);

  return createAuditLog({
    action: input.action,
    outcome: input.outcome,
    actorUserId: input.actorUserId ?? null,
    subjectType: input.subjectType ?? null,
    subjectId: input.subjectId ?? null,
    sessionId: input.sessionId ?? null,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });
}

const auditCursorSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.string().uuid(),
});

function decodeCursor(cursor: string) {
  try {
    const parsed = auditCursorSchema.parse(
      JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")),
    );
    return { createdAt: new Date(parsed.createdAt), id: parsed.id };
  } catch {
    throw new ApplicationError(
      400,
      "VALIDATION_ERROR",
      "Cursor audit log không hợp lệ",
    );
  }
}

function encodeCursor(item: { id: string; createdAt: Date }) {
  return Buffer.from(
    JSON.stringify({ id: item.id, createdAt: item.createdAt.toISOString() }),
  ).toString("base64url");
}

// Trả một trang audit log ổn định; cursor không để lộ cấu trúc query cho client.
export async function listAuditLogs(query: ListAuditLogsQuery) {
  const records = await findAuditLogs({
    limit: query.limit,
    ...(query.action ? { action: query.action } : {}),
    ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
    ...(query.cursor ? { cursor: decodeCursor(query.cursor) } : {}),
  });
  const hasNextPage = records.length > query.limit;
  const auditLogs = records.slice(0, query.limit);
  const lastItem = auditLogs.at(-1);

  return {
    auditLogs,
    nextCursor: hasNextPage && lastItem ? encodeCursor(lastItem) : null,
  };
}
