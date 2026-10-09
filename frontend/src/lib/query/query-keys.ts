export const queryKeys = {
  health: ["health"] as const,
  system: {
    emailVerification: (accountId: string) =>
      ["system", "email-verification", accountId] as const,
  },
  users: {
    all: ["users"] as const,
    list: (accountId: string) => ["users", "list", accountId] as const,
  },
  auditLogs: {
    all: ["audit-logs"] as const,
    list: (
      accountId: string,
      filters: { action?: string; actorUserId?: string; limit: number },
    ) => ["audit-logs", "list", accountId, filters] as const,
  },
};
