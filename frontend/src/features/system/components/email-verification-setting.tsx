"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getEmailVerificationSetting, setEmailVerificationSetting } from "../api/system.api";

export function EmailVerificationSetting() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["system", "email-verification"], queryFn: getEmailVerificationSetting });
  const mutation = useMutation({ mutationFn: setEmailVerificationSetting, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["system", "email-verification"] }) });
  if (query.isPending) return <p className="mt-8">Đang tải cấu hình email...</p>;
  if (query.isError) return <p className="mt-8" role="alert">Không thể tải cấu hình email.</p>;
  return <section className="mt-8 border border-[var(--ink)] bg-[var(--paper)] p-6"><p className="font-mono text-xs tracking-[0.12em]">EMAIL VERIFICATION</p><div className="mt-3 flex items-center justify-between gap-4"><p className="m-0">Gửi email xác thực toàn hệ thống</p><button type="button" className="border border-[var(--ink)] px-4 py-2 font-mono text-xs uppercase" disabled={mutation.isPending} onClick={() => mutation.mutate(!query.data)}>{query.data ? "Đang bật" : "Đang tắt"}</button></div></section>;
}
