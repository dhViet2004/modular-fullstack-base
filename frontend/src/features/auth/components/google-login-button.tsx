"use client";

import { useSearchParams } from "next/navigation";

import { getGoogleOAuthStartUrl } from "../api/auth.api";

export function GoogleLoginButton() {
  const googleLoginFailed =
    useSearchParams().get("error") === "google_login_failed";

  return (
    <div className="mt-5 grid gap-3 border-t border-[var(--line)] pt-5">
      <a
        className="grid min-h-12 place-items-center border border-[var(--ink)] bg-transparent px-4 font-mono text-xs font-semibold tracking-[0.08em] text-[var(--ink)] no-underline uppercase hover:bg-[var(--acid)]"
        href={getGoogleOAuthStartUrl()}
      >
        Đăng nhập với Google
      </a>
      {googleLoginFailed ? (
        <p className="m-0 text-sm text-[#b52f1d]" role="alert">
          Đăng nhập Google thất bại. Vui lòng thử lại.
        </p>
      ) : null}
    </div>
  );
}
