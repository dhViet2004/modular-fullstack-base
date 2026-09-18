export const authKeys = { all: ["auth"] as const };
export const userKeys = {
  all: ["users"] as const,
  list: (p = 1) => [...userKeys.all, "list", p] as const,
  detail: (id: string) => [...userKeys.all, id] as const,
  permissions: (id: string) => [...userKeys.all, id, "permissions"] as const,
  roles: () => [...userKeys.all, "roles"] as const
};
export const fileKeys = { all: ["files"] as const };
export const sessionKeys = { all: ["sessions"] as const };
export const mailKeys = { all: ["mail"] as const };
export const jobKeys = { all: ["jobs"] as const };
