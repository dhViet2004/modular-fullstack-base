"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { getGoogleOAuthStartUrl } from "../api/auth.api";
import { getPostLoginPath } from "../post-login-route";
import { useAuth } from "./auth-provider";
import { AuthStateCard } from "./auth-page";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/feedback";

// Đổi refresh cookie thành access token trong memory rồi điều hướng theo permission.
export function GoogleOAuthCallback() {
  const router = useRouter();
  const { user, status, retrySession } = useAuth();
  const redirected = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !user || redirected.current) return;
    redirected.current = true;
    router.replace(getPostLoginPath(user.roles));
  }, [router, status, user]);

  if (
    status === "guest" ||
    status === "expired" ||
    status === "restore-error"
  ) {
    return (
      <AuthStateCard
        state="error"
        title="Không thể đăng nhập bằng Google"
        description="Hãy thử lại hoặc sử dụng email và mật khẩu."
      >
        {status === "restore-error" ? (
          <>
            <InlineAlert>
              Không thể kết nối để khôi phục phiên. Vui lòng thử lại.
            </InlineAlert>
            <Button onClick={retrySession}>Thử khôi phục lại</Button>
          </>
        ) : (
          <a
            className="ui-button auth-link-button"
            href={getGoogleOAuthStartUrl()}
          >
            Thử lại
          </a>
        )}
        <Link
          className="ui-button auth-link-button"
          data-variant="secondary"
          href="/login"
        >
          Dùng email và mật khẩu
        </Link>
      </AuthStateCard>
    );
  }

  if (status === "authenticated" && user) {
    return (
      <AuthStateCard
        state="success"
        title="Đăng nhập thành công"
        description="Đang chuyển đến trang phù hợp với quyền của bạn."
      />
    );
  }

  return (
    <AuthStateCard
      state="loading"
      title="Đang hoàn tất đăng nhập"
      description="Vui lòng chờ trong khi chứng thực tài khoản."
    />
  );
}
