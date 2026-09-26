"use client";

import Link from "next/link";

import { EmailVerificationNotice } from "./email-verification-notice";
import { useAuth } from "./auth-provider";
import { LogoutButton } from "./logout-button";

export function AccountPanel() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <p>Đang khôi phục phiên...</p>;
  if (!user) return <p>Bạn chưa đăng nhập. <Link href="/login">Đăng nhập</Link></p>;

  return (
    <section className="w-full max-w-2xl">
      <EmailVerificationNotice />
      <div className="border border-[var(--ink)] bg-[var(--paper)] p-6">
        <p className="font-mono text-xs font-semibold tracking-[0.12em]">ACCOUNT</p>
        <h1 className="mt-2 text-5xl tracking-[-0.05em]">
          {user.displayName ?? "Tài khoản"}
        </h1>
        <p className="mt-4">{user.email}</p>
        <p className="font-mono text-xs">
          {user.emailVerifiedAt ? "EMAIL VERIFIED" : "EMAIL PENDING"}
        </p>
        <div className="mt-6 flex gap-4">
          {user.permissions.includes("users:read") ? (
            <Link className="underline underline-offset-4" href="/admin/users">
              Quản trị
            </Link>
          ) : null}
          <LogoutButton />
        </div>
      </div>
    </section>
  );
}
