"use client";

import axios from "axios";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/feedback";

import { useAuth } from "./auth-provider";
import { useRequestEmailVerification } from "../hooks/use-request-email-verification";

type ApiErrorResponse = { error?: { code?: string } };

export function EmailVerificationNotice({
  mutation: sharedMutation,
  className = "",
  title,
}: {
  mutation?: ReturnType<typeof useRequestEmailVerification>;
  className?: string;
  title?: string;
}) {
  const { user } = useAuth();
  const ownMutation = useRequestEmailVerification();
  const mutation = sharedMutation ?? ownMutation;

  if (!user || user.emailVerifiedAt) return null;

  const isRateLimited =
    mutation.isError &&
    axios.isAxiosError<ApiErrorResponse>(mutation.error) &&
    mutation.error.response?.data?.error?.code ===
      "EMAIL_VERIFICATION_RATE_LIMITED";

  return (
    <section
      className={"auth-email-notice " + className}
      aria-label="Email chưa xác minh"
    >
      {title && <p>{title}</p>}
      <p>Kiểm tra hộp thư của {user.email}.</p>
      <Button
        variant="secondary"
        loading={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? "Đang gửi yêu cầu..." : "Gửi lại email"}
      </Button>
      {mutation.isSuccess ? (
        <InlineAlert variant="success">
          Đã nhận yêu cầu gửi email xác minh. Vui lòng kiểm tra hộp thư.
        </InlineAlert>
      ) : null}
      {mutation.isError ? (
        <InlineAlert>
          {isRateLimited
            ? "Vui lòng chờ trước khi gửi lại."
            : "Không thể gửi email. Vui lòng thử lại."}
        </InlineAlert>
      ) : null}
      {/* ponytail: No server resend deadline is exposed; keep manual retry until the API supplies one. */}
      {isRateLimited ? (
        <p className="auth-description">
          Thời gian chờ do máy chủ quản lý. Vui lòng thử lại sau.
        </p>
      ) : null}
    </section>
  );
}
