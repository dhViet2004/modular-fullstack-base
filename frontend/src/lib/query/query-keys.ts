export const queryKeys = {
  health: ["health"] as const,
  users: {
    all: ["users"] as const,
    list: () => ["users", "list"] as const,
  },
  auditLogs: {
    all: ["audit-logs"] as const,
    list: () => ["audit-logs", "list"] as const,
  },
};
