"use client";

import axios from "axios";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useVerifyEmail } from "../hooks/use-verify-email";

type ApiErrorResponse = { error?: { code?: string } };

export function VerifyEmailPanel() {
  const token = useSearchParams().get("token");
  const mutation = useVerifyEmail();

  if (!token) {
    return (
      <p role="alert">Liên kết xác minh không hợp lệ hoặc thiếu token.</p>
    );
  }

  if (mutation.isSuccess) {
    return (
      <div aria-live="polite">
        <p>Email đã được xác minh.</p>
        <Link className="font-semibold underline underline-offset-4" href="/account">
          Mở tài khoản
        </Link>
      </div>
    );
  }

  const invalidToken =
    mutation.isError &&
    axios.isAxiosError<ApiErrorResponse>(mutation.error) &&
    mutation.error.response?.data.error?.code ===
      "INVALID_EMAIL_VERIFICATION_TOKEN";

  return (
    <div>
      <p>Xác nhận để hoàn tất địa chỉ email của bạn.</p>
      <button
        className="mt-4 min-h-11 border border-[var(--ink)] bg-[var(--ink)] px-5 font-mono text-xs font-semibold text-[var(--paper)] uppercase disabled:opacity-60"
        type="button"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(token)}
      >
        {mutation.isPending ? "Đang xác minh..." : "Xác minh email"}
      </button>
      {mutation.isError ? (
        <p className="mt-4 text-sm text-[#b52f1d]" role="alert">
          {invalidToken
            ? "Liên kết không hợp lệ hoặc đã hết hạn."
            : "Không thể xác minh email. Vui lòng thử lại."}
        </p>
      ) : null}
    </div>
  );
}
