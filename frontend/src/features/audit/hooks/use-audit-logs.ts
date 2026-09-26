"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";
import { getAuditLogs } from "../api/audit.api";

// Quản lý cursor pagination và chỉ gọi API khi user có quyền đọc audit log.
export function useAuditLogs(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.auditLogs.list(),
    queryFn: ({ pageParam }) => getAuditLogs(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
}
