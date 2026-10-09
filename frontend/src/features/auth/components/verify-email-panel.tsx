"use client";

import axios from "axios";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/feedback";

import { useVerifyEmail } from "../hooks/use-verify-email";
import { getPostLoginPath } from "../post-login-route";
import { useAuth } from "./auth-provider";
import { AuthStateCard } from "./auth-page";
import { EmailVerificationNotice } from "./email-verification-notice";

type ApiErrorResponse = { error?: { code?: string } };

export function VerifyEmailPanel() {
  const token = useSearchParams().get("token");
  const mutation = useVerifyEmail();
  const { user, isLoading } = useAuth();

  if (!token) {
    if (isLoading) {
      return (
        <AuthStateCard
          state="loading"
          title="Đang tải thông tin tài khoản"
          description="Vui lòng chờ trong khi thông tin tài khoản được kiểm tra."
        />
      );
    }
    if (user && !user.emailVerifiedAt) {
      return (
        <AuthStateCard
          state="mail"
          title="Email chưa được xác minh"
          description="Yêu cầu gửi lại email và kiểm tra hộp thư của bạn."
        >
          <EmailVerificationNotice />
        </AuthStateCard>
      );
    }
    return (
      <AuthStateCard
        state="error"
        title="Liên kết không hợp lệ hoặc hết hạn"
        description="Hãy yêu cầu một liên kết xác minh mới từ tài khoản của bạn."
      >
        <Link
          className="ui-button auth-link-button"
          href={user ? "/account" : "/login"}
        >
          {user ? "Về tài khoản" : "Đăng nhập"}
        </Link>
      </AuthStateCard>
    );
  }

  if (mutation.isSuccess) {
    return (
      <AuthStateCard
        state="success"
        title="Email đã được xác minh"
        description="Bạn đã hoàn tất xác minh email của tài khoản."
      >
        <Link
          className="ui-button auth-link-button"
          href={user ? getPostLoginPath(user.roles) : "/login"}
        >
          {user ? "Về trang của tôi" : "Đăng nhập"}
        </Link>
      </AuthStateCard>
    );
  }

  const invalidToken =
    mutation.isError &&
    axios.isAxiosError<ApiErrorResponse>(mutation.error) &&
    mutation.error.response?.data?.error?.code ===
      "INVALID_EMAIL_VERIFICATION_TOKEN";

  if (mutation.isPending) {
    return (
      <AuthStateCard
        state="loading"
        title="Đang xác minh email"
        description="Vui lòng chờ trong khi liên kết được kiểm tra."
      />
    );
  }

  if (invalidToken) {
    return (
      <AuthStateCard
        state="error"
        title="Liên kết không hợp lệ hoặc hết hạn"
        description="Hãy yêu cầu một liên kết xác minh mới từ tài khoản của bạn."
      >
        <Link
          className="ui-button auth-link-button"
          href={user ? "/account" : "/login"}
        >
          {user ? "Về tài khoản" : "Đăng nhập"}
        </Link>
      </AuthStateCard>
    );
  }

  return (
    <AuthStateCard
      state="mail"
      title="Xác minh email"
      description="Xác nhận để hoàn tất địa chỉ email của bạn."
    >
      {mutation.isError ? (
        <InlineAlert>Không thể xác minh email. Vui lòng thử lại.</InlineAlert>
      ) : null}
      <Button onClick={() => mutation.mutate(token)}>
        {mutation.isError ? "Thử lại" : "Xác minh email"}
      </Button>
    </AuthStateCard>
  );
}
