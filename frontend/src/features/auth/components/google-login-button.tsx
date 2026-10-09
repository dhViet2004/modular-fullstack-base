"use client";

import { useSearchParams } from "next/navigation";

import { getGoogleOAuthStartUrl } from "../api/auth.api";
import { InlineAlert } from "@/components/ui/feedback";

export function GoogleLoginButton() {
  const googleLoginFailed =
    useSearchParams().get("error") === "google_login_failed";

  return (
    <div>
      <div className="auth-divider">Hoặc</div>
      <a
        className="ui-button auth-link-button"
        data-variant="secondary"
        href={getGoogleOAuthStartUrl()}
      >
        Tiếp tục với Google
      </a>
      {googleLoginFailed ? (
        <InlineAlert className="mt-4">
          Đăng nhập Google thất bại. Vui lòng thử lại.
        </InlineAlert>
      ) : null}
    </div>
  );
}
