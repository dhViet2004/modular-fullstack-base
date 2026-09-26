export const PERMISSIONS = {
  USERS_READ: "users:read",
  AUDIT_READ: "audit:read",
} as const;

export function canReadAuditLogs(permissions: string[]) {
  return permissions.includes(PERMISSIONS.AUDIT_READ);
}
