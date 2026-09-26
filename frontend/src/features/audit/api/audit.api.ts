import { apiClient } from "@/lib/axios/client";

export type AuditLog = {
  id: string;
  action: string;
  outcome: "SUCCESS" | "FAILURE";
  actorUserId: string | null;
  subjectType: string | null;
  subjectId: string | null;
  sessionId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: string;
};

export type AuditLogPage = {
  auditLogs: AuditLog[];
  nextCursor: string | null;
};

type AuditLogsResponse = {
  success: true;
  data: AuditLogPage;
};

// Lấy một trang audit log; backend tự kiểm tra permission audit:read.
export async function getAuditLogs(cursor: string | null) {
  const response = await apiClient.get<AuditLogsResponse>("/audit-logs", {
    params: { limit: 50, ...(cursor ? { cursor } : {}) },
  });
  return response.data.data;
}
