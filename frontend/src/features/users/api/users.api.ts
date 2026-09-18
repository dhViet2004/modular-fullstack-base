import { api } from "@/lib/axios/client";
import type { AuthUser } from "@/lib/auth/auth-client";
import type { User, UserPermissionsResponse, UserRole, Permission } from "../types/user";

export const usersApi = {
  me: () => api.get("/users/me").then((r) => r.data.data as AuthUser),
  list: () => api.get("/users").then((r) => r.data.data.items as User[]),
  detail: (id: string) => api.get(`/users/${id}`).then((r) => r.data.data as User),
  update: (id: string, displayName: string) => api.patch(`/users/${id}`, { displayName }),
  block: (id: string) => api.post(`/users/${id}/block`),
  unblock: (id: string) => api.post(`/users/${id}/unblock`),
  assign: (id: string, roleId: string) => api.post(`/users/${id}/roles`, { roleId }),
  remove: (id: string, roleId: string) => api.delete(`/users/${id}/roles/${roleId}`, { data: { roleId } }),
  resetPassword: (id: string) =>
    api.post(`/users/${id}/reset-password`).then((r) => r.data.data as { temporaryExpiresAt: string; message: string }),
  getPermissions: (id: string) =>
    api.get(`/users/${id}/permissions`).then((r) => r.data.data as UserPermissionsResponse),
  overridePermission: (id: string, permissionId: string, effect: "ALLOW" | "DENY") =>
    api.post(`/users/${id}/permissions/override`, { permissionId, effect }),
  removePermissionOverride: (id: string, permissionId: string) =>
    api.delete(`/users/${id}/permissions/override/${permissionId}`),
  changePassword: (data: { currentPassword: string; newPassword: string; revokeOtherSessions?: boolean }) =>
    api.post("/users/me/change-password", data),
  getRoles: () =>
    api.get("/users/roles").then((r) => r.data.data as { roles: UserRole[]; permissions: Permission[] }),
  createRole: (data: { name: string; rank: number; permissionIds?: string[] }) =>
    api.post("/users/roles", data).then((r) => r.data.data as UserRole),
  updateRolePermissions: (roleId: string, permissionIds: string[]) =>
    api.put(`/users/roles/${roleId}/permissions`, { permissionIds }).then((r) => r.data.data as UserRole),
  deleteRole: (roleId: string) =>
    api.delete(`/users/roles/${roleId}`).then((r) => r.data.data as { success: boolean })
};
