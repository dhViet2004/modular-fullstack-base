"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { getApiHealth } from "../api/system.api";

export function useApiHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: getApiHealth,
    retry: 1,
  });
}
