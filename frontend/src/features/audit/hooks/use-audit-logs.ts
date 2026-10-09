"use client";

import { useEffect } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";
import { getAuditLogs, type AuditFilters } from "../api/audit.api";

// Quản lý cursor pagination và chỉ gọi API khi user có quyền đọc audit log.
export function useAuditLogs(
  accountId: string,
  filters: AuditFilters,
  enabled: boolean,
) {
  const client = useQueryClient();
  const { action, actorUserId, limit } = filters;
  useEffect(
    () => () => {
      // Dropping old pages also starts at the first cursor when revisiting a filter set.
      const queryKey = queryKeys.auditLogs.list(accountId, {
        limit,
        ...(action ? { action } : {}),
        ...(actorUserId ? { actorUserId } : {}),
      });
      void client.cancelQueries({ queryKey, exact: true });
      client.removeQueries({ queryKey, exact: true });
    },
    [accountId, action, actorUserId, limit, client],
  );
  useEffect(() => {
    if (!enabled)
      void client.cancelQueries({
        queryKey: queryKeys.auditLogs.list(accountId, filters),
        exact: true,
      });
  }, [accountId, client, enabled, filters]);
  return useInfiniteQuery({
    queryKey: queryKeys.auditLogs.list(accountId, filters),
    queryFn: ({ pageParam, signal }) =>
      getAuditLogs(pageParam, filters, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
    retry: false,
  });
}
