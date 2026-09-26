"use client";

import Link from "next/link";

import { getNavigationItems } from "../permissions";
import { useAuth } from "./auth-provider";

export function RoleDashboard({ role }: { role: "ADMIN" | "SUPER_ADMIN" }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p>Đang khôi phục phiên...</p>;
  if (!user) return <p>Bạn chưa đăng nhập. <Link href="/login">Đăng nhập</Link></p>;
  if (!user.roles.includes(role)) return <p role="alert">Bạn không có quyền truy cập trang này.</p>;

  const title = role === "SUPER_ADMIN" ? "Trung tâm hệ thống" : "Trung tâm quản trị";
  const items = getNavigationItems(user.roles, user.permissions).filter((item) =>
    item.href !== "/admin" && item.href !== "/super-admin",
  );

  return (
    <section className="max-w-5xl">
      <p className="font-mono text-xs font-semibold tracking-[0.16em] text-[var(--signal)]">{role.replace("_", " ")} / WORKSPACE</p>
      <h1 className="mt-4 text-[clamp(3rem,8vw,6rem)] leading-[0.92]">{title}</h1>
      <p className="mt-5 max-w-xl text-lg">Xin chào {user.displayName ?? user.email}. Chọn khu vực bạn cần làm việc.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {items.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-36 flex-col justify-between border border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[6px_6px_0_var(--acid)]"
          >
            <span className="font-mono text-xs tracking-[0.12em]">0{index + 1} / {role}</span>
            <span className="text-3xl font-semibold tracking-[-0.04em]">{item.label} ↗</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
