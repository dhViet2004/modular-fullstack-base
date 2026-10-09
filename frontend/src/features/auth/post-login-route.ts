import { getRoleFlags } from "./permissions";

export function getAccountTab(value: string | null) {
  return value === "sessions" || value === "security" ? value : "overview";
}

export function getPostLoginPath(roles: string[]) {
  const { isSuperAdmin, isAdmin } = getRoleFlags(roles);
  if (isSuperAdmin) return "/super-admin";
  if (isAdmin) return "/admin";
  return "/account";
}
