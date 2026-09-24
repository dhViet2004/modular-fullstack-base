export const queryKeys = {
  health: ["health"] as const,
  users: {
    all: ["users"] as const,
    list: () => ["users", "list"] as const,
  },
};
