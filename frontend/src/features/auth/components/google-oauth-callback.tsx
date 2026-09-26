"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { restoreAuthenticatedSession } from "../api/auth.api";
import { getPostLoginPath } from "../post-login-route";
import { useAuth } from "./auth-provider";

// Đổi refresh cookie thành access token trong memory rồi điều hướng theo permission.
export function GoogleOAuthCallback() {
  const router = useRouter();
  const { setAuthenticatedUser } = useAuth();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void restoreAuthenticatedSession()
      .then((user) => {
        setAuthenticatedUser(user);
        router.replace(getPostLoginPath(user.roles));
      })
      .catch(() => {
        setFailed(true);
      });
  }, [router, setAuthenticatedUser]);

  if (failed) {
    return (
      <div role="alert">
        <p>Không thể hoàn tất đăng nhập Google.</p>
        <a className="font-semibold underline underline-offset-4" href="/login">
          Quay lại đăng nhập
        </a>
      </div>
    );
  }

  return <p aria-live="polite">Đang hoàn tất đăng nhập...</p>;
}
