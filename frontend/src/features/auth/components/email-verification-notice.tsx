"use client";

import axios from "axios";

import { useAuth } from "./auth-provider";
import { useRequestEmailVerification } from "../hooks/use-request-email-verification";

type ApiErrorResponse = { error?: { code?: string } };

export function EmailVerificationNotice() {
  const { user } = useAuth();
  const mutation = useRequestEmailVerification();

  if (!user || user.emailVerifiedAt) return null;

  const isRateLimited =
    mutation.isError &&
    axios.isAxiosError<ApiErrorResponse>(mutation.error) &&
    mutation.error.response?.data.error?.code ===
      "EMAIL_VERIFICATION_RATE_LIMITED";

  return (
    <section className="mb-6 border border-[var(--ink)] bg-[var(--acid)] p-4">
      <p className="m-0 font-mono text-xs font-semibold tracking-[0.1em]">
        EMAIL CHƯA XÁC MINH
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-sm">Kiểm tra hộp thư của {user.email}.</p>
        <button
          className="min-h-10 border border-[var(--ink)] bg-[var(--ink)] px-4 font-mono text-xs font-semibold text-[var(--paper)] uppercase disabled:opacity-60"
          type="button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Đang gửi..." : "Gửi email"}
        </button>
      </div>
      {mutation.isSuccess ? (
        <p className="mt-3 mb-0 text-sm" role="status">
          Đã nhận yêu cầu gửi email xác minh.
        </p>
      ) : null}
      {mutation.isError ? (
        <p className="mt-3 mb-0 text-sm text-[#b52f1d]" role="alert">
          {isRateLimited
            ? "Vui lòng chờ trước khi gửi lại."
            : "Không thể gửi email. Vui lòng thử lại."}
        </p>
      ) : null}
    </section>
  );
}
