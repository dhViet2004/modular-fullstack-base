import { getRoleFlags } from "./permissions";

export function getAccountTab(value: string | null) {
  return value === "roles" || value === "sessions" || value === "security"
    ? value
    : "info";
}

export function getPostLoginPath(roles: string[]) {
  const { isSuperAdmin, isAdmin } = getRoleFlags(roles);
  if (isSuperAdmin) return "/super-admin";
  if (isAdmin) return "/admin";
  return "/account";
}
