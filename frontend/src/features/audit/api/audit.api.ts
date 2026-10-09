import { apiClient } from "@/lib/axios/client";

// Values accepted by the existing backend audit query schema.
export const AUDIT_ACTIONS = [
  "AUTH_LOGIN_SUCCEEDED",
  "AUTH_LOGIN_FAILED",
  "AUTH_LOGOUT_SUCCEEDED",
  "AUTH_GOOGLE_LOGIN_SUCCEEDED",
  "AUTH_GOOGLE_LOGIN_FAILED",
  "EMAIL_VERIFICATION_REQUESTED",
  "EMAIL_VERIFICATION_SUCCEEDED",
  "EMAIL_VERIFICATION_FAILED",
  "USER_SUSPENDED",
  "USER_ACTIVATED",
  "USER_ROLE_ASSIGNED",
  "USER_ROLE_REMOVED",
] as const;

export type AuditFilters = {
  action?: (typeof AUDIT_ACTIONS)[number];
  actorUserId?: string;
  limit: number;
};

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
export async function getAuditLogs(
  cursor: string | null,
  filters: AuditFilters,
  signal?: AbortSignal,
) {
  const response = await apiClient.get<AuditLogsResponse>("/audit-logs", {
    params: {
      limit: filters.limit,
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.actorUserId ? { actorUserId: filters.actorUserId } : {}),
      ...(cursor ? { cursor } : {}),
    },
    signal,
  });
  return response.data.data;
}
