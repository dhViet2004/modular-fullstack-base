"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userKeys } from "@/lib/query/query-keys";
import { usersApi } from "../api/users.api";

export const useUsers = () =>
  useQuery({
    queryKey: userKeys.list(),
    queryFn: usersApi.list
  });

export const useUserDetail = (id: string) =>
  useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => usersApi.detail(id),
    enabled: Boolean(id)
  });

export const useUserPermissions = (id: string) =>
  useQuery({
    queryKey: userKeys.permissions(id),
    queryFn: () => usersApi.getPermissions(id),
    enabled: Boolean(id)
  });

export const useAvailableRoles = () =>
  useQuery({
    queryKey: userKeys.roles(),
    queryFn: usersApi.getRoles
  });

export const useUserAction = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: ({ action, id }: { action: "block" | "unblock"; id: string }) => usersApi[action](id),
    onSuccess: () => q.invalidateQueries({ queryKey: userKeys.all })
  });
};

export const useAssignUserRole = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => usersApi.assign(userId, roleId),
    onSuccess: () => q.invalidateQueries({ queryKey: userKeys.all })
  });
};

export const useRemoveUserRole = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => usersApi.remove(userId, roleId),
    onSuccess: () => q.invalidateQueries({ queryKey: userKeys.all })
  });
};

export const useCreateRole = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; rank: number; permissionIds?: string[] }) => usersApi.createRole(data),
    onSuccess: () => q.invalidateQueries({ queryKey: userKeys.roles() })
  });
};

export const useUpdateRolePermissions = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      usersApi.updateRolePermissions(roleId, permissionIds),
    onSuccess: () => {
      q.invalidateQueries({ queryKey: userKeys.roles() });
      q.invalidateQueries({ queryKey: userKeys.all });
    }
  });
};

export const useDeleteRole = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) => usersApi.deleteRole(roleId),
    onSuccess: () => {
      q.invalidateQueries({ queryKey: userKeys.roles() });
      q.invalidateQueries({ queryKey: userKeys.all });
    }
  });
};

export const useResetUserPassword = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.resetPassword(id),
    onSuccess: () => q.invalidateQueries({ queryKey: userKeys.all })
  });
};

export const useOverridePermission = (userId: string) => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: ({ permissionId, effect }: { permissionId: string; effect: "ALLOW" | "DENY" }) =>
      usersApi.overridePermission(userId, permissionId, effect),
    onSuccess: () => {
      q.invalidateQueries({ queryKey: userKeys.permissions(userId) });
      q.invalidateQueries({ queryKey: userKeys.detail(userId) });
    }
  });
};

export const useRemovePermissionOverride = (userId: string) => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: (permissionId: string) => usersApi.removePermissionOverride(userId, permissionId),
    onSuccess: () => {
      q.invalidateQueries({ queryKey: userKeys.permissions(userId) });
      q.invalidateQueries({ queryKey: userKeys.detail(userId) });
    }
  });
};
