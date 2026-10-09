"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { getEmailVerificationSetting } from "../api/system.api";

export function useEmailVerificationSetting(
  accountId: string,
  enabled: boolean,
) {
  const client = useQueryClient();
  useEffect(
    () => () => {
      const queryKey = queryKeys.system.emailVerification(accountId);
      void client.cancelQueries({ queryKey, exact: true });
      client.removeQueries({ queryKey, exact: true });
    },
    [accountId, client],
  );
  useEffect(() => {
    if (!enabled)
      void client.cancelQueries({
        queryKey: queryKeys.system.emailVerification(accountId),
        exact: true,
      });
  }, [accountId, client, enabled]);
  return useQuery({
    queryKey: queryKeys.system.emailVerification(accountId),
    queryFn: ({ signal }) => getEmailVerificationSetting(signal),
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
