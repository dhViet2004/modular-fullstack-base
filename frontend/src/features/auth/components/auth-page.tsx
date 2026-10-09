import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

function Brand() {
  return (
    <Link
      className="auth-brand"
      href="/login"
      aria-label="CoreStack - Đăng nhập"
    >
      <span className="auth-brand-mark" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="m3 8 9-4 9 4-9 4-9-4Zm0 4 9 4 9-4M3 16l9 4 9-4" />
        </svg>
      </span>
      CORESTACK
    </Link>
  );
}

export function AuthPage({
  children,
  variant = "status",
}: {
  children: ReactNode;
  variant?: "form" | "status";
}) {
  return (
    <main className={`public-auth public-auth--${variant}`}>
      {variant === "form" ? (
        <aside className="auth-aside" aria-label="Giới thiệu CoreStack">
          <Brand />
          <div className="auth-aside-intro">
            <span className="auth-aside-badge">
              CORE BASE · KHÔNG GIAN LÀM VIỆC
            </span>
            <h2>
              Một nền tảng.
              <br />
              Đúng quyền. Đúng việc.
            </h2>
            <p>
              Quản lý tài khoản, phiên đăng nhập và tệp riêng trong một không
              gian rõ ràng, nhất quán.
            </p>
          </div>
          <div className="auth-preview" aria-hidden="true">
            <div className="auth-preview-card">
              <span className="auth-preview-shield">◇</span>
              <div>
                <strong>Quyền truy cập rõ ràng</strong>
                <p>Thành viên · Quản trị · Siêu quản trị</p>
              </div>
            </div>
            <div className="auth-preview-line" />
            <div className="auth-preview-line auth-preview-line--short" />
          </div>
          <p className="auth-aside-footer">
            CORESTACK / CORE BASE
            <br />
            Không gian tài khoản và tệp riêng của bạn.
          </p>
        </aside>
      ) : null}
      <div
        className={variant === "form" ? "auth-form-area" : "auth-status-area"}
      >
        <div
          className={
            variant === "form" ? "auth-form-content" : "auth-status-content"
          }
        >
          <div className="auth-page-brand">
            <Brand />
          </div>
          {children}
          <p className="auth-footer">
            Không chia sẻ mật khẩu. Thông tin tài khoản của bạn được bảo vệ theo
            phạm vi quyền truy cập.
          </p>
        </div>
      </div>
    </main>
  );
}

export function AuthStateCard({
  title,
  description,
  state = "info",
  children,
}: {
  title: string;
  description: ReactNode;
  state?: "loading" | "success" | "info" | "mail" | "expired" | "error";
  children?: ReactNode;
}) {
  return (
    <Card className="auth-state-card">
      {/* ponytail: CSS/SVG symbols replace unavailable original icons; swap when Figma assets are supplied. */}
      <span className="auth-state-icon" data-state={state} aria-hidden="true">
        {state === "loading" ? (
          <span className="ui-spinner" />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {state === "success" ? (
              <>
                <circle cx="12" cy="12" r="9" />
                <path d="m8 12 3 3 5-6" />
              </>
            ) : state === "mail" ? (
              <>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 6 9 7 9-7" />
              </>
            ) : state === "expired" ? (
              <>
                <path d="M14 4h5v16h-5M3 12h12m-4-4 4 4-4 4" />
              </>
            ) : (
              <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5M12 8h.01" />
              </>
            )}
          </svg>
        )}
      </span>
      <div
        role={
          state === "loading" || state === "success"
            ? "status"
            : state === "expired" || state === "error"
              ? "alert"
              : undefined
        }
        aria-live="polite"
      >
        <h1>{title}</h1>
        <p className="auth-description">{description}</p>
      </div>
      {children}
    </Card>
  );
}
