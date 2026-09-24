"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";
import { getUsers } from "../api/users.api";

// Quản lý server state của danh sách user bằng TanStack Query.
export function useUsers(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: getUsers,
    enabled,
  });
}
