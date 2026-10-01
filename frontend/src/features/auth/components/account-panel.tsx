"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { changePassword, getCurrentUser, getSessions, revokeSession, type AuthSession } from "../api/auth.api";
import { useAuth } from "./auth-provider";
import { EmailVerificationNotice } from "./email-verification-notice";
import { LogoutButton } from "./logout-button";

type AccountTab = "overview" | "security" | "sessions";
const tabs: { id: AccountTab; label: string; detail: string }[] = [
  { id: "overview", label: "Tổng quan", detail: "Thông tin tài khoản" },
  { id: "security", label: "Bảo mật", detail: "Mật khẩu và xác thực" },
  { id: "sessions", label: "Phiên đăng nhập", detail: "Thiết bị đang hoạt động" },
];

export function AccountPanel() {
  const { user, isLoading, setAuthenticatedUser } = useAuth();
  const [activeTab, setActiveTab] = useState<AccountTab>("overview");
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => { if (user) void getSessions().then(setSessions); }, [user]);
  if (isLoading) return <p className="font-mono text-sm">Đang khôi phục phiên...</p>;
  if (!user) return <p>Bạn chưa đăng nhập. <Link className="underline" href="/login">Đăng nhập</Link></p>;
  const hasPassword = user.hasPassword;
  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    try {
      await changePassword(String(data.get("newPassword")), hasPassword ? String(data.get("currentPassword")) : undefined);
      setAuthenticatedUser(await getCurrentUser()); event.currentTarget.reset();
      setMessage(hasPassword ? "Đã đổi mật khẩu." : "Đã đặt mật khẩu. Bạn có thể đăng nhập bằng email và mật khẩu.");
    } catch { setMessage(hasPassword ? "Mật khẩu hiện tại không đúng hoặc mật khẩu mới chưa hợp lệ." : "Không thể đặt mật khẩu mới."); }
  }
  return <section className="w-full max-w-6xl">
    <EmailVerificationNotice />
    <header className="mt-5 border border-[var(--ink)] bg-[var(--ink)] p-6 text-[var(--paper)] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-6"><div><p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--acid)]">Không gian cá nhân</p><h1 className="mt-3 text-4xl tracking-[-0.06em] sm:text-6xl">{user.displayName ?? "Tài khoản"}</h1><p className="mt-3 text-sm text-[var(--paper)]/70">{user.email}</p></div><div className="flex items-center gap-3">{user.permissions.includes("users:read") && <Link className="border border-[var(--paper)]/40 px-4 py-2 text-sm hover:bg-[var(--paper)] hover:text-[var(--ink)]" href="/admin/users">Quản trị</Link>}<LogoutButton /></div></div>
    </header>
    <div className="mt-5 grid gap-5 lg:grid-cols-[240px_1fr]">
      <nav aria-label="Tùy chọn tài khoản" className="h-fit border border-[var(--ink)] bg-[var(--paper)] p-3"><p className="px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] opacity-60">Tài khoản</p><div className="grid gap-1">{tabs.map((tab) => <button className={`flex items-center justify-between px-3 py-3 text-left transition ${activeTab === tab.id ? "bg-[var(--signal)]" : "hover:bg-[var(--acid)]"}`} key={tab.id} onClick={() => { setActiveTab(tab.id); setMessage(""); }} type="button"><span className="text-sm font-semibold">{tab.label}</span><span className="font-mono text-[10px] opacity-60">{tab.id === "overview" ? "01" : tab.id === "security" ? "02" : "03"}</span></button>)}</div></nav>
      <div className="min-w-0">
        {activeTab === "overview" && <div className="grid gap-5 sm:grid-cols-2"><article className="border border-[var(--ink)] bg-[var(--paper)] p-6 sm:col-span-2"><p className="font-mono text-xs uppercase tracking-[0.16em] opacity-60">Tổng quan</p><h2 className="mt-3 text-3xl tracking-[-0.04em]">Chào mừng trở lại.</h2><p className="mt-3 max-w-xl text-sm leading-6 opacity-70">Quản lý thông tin đăng nhập, theo dõi các phiên đang hoạt động và giữ tài khoản của bạn an toàn.</p></article><article className="border border-[var(--ink)] bg-[var(--acid)] p-6"><p className="font-mono text-xs uppercase tracking-[0.16em]">Email</p><p className="mt-8 break-all text-lg font-semibold">{user.email}</p><p className="mt-2 text-sm opacity-70">Địa chỉ dùng để đăng nhập và nhận thông báo.</p></article><article className="border border-[var(--ink)] bg-[var(--paper)] p-6"><p className="font-mono text-xs uppercase tracking-[0.16em]">Trạng thái</p><p className="mt-8 text-lg font-semibold">{user.emailVerifiedAt ? "Email đã xác thực" : "Chờ xác thực email"}</p><p className="mt-2 text-sm opacity-70">Bạn có thể cập nhật bảo mật ở tab bên cạnh.</p></article></div>}
        {activeTab === "security" && <div className="space-y-5"><form onSubmit={submitPassword} className="border border-[var(--ink)] bg-[var(--paper)] p-6 sm:p-8"><p className="font-mono text-xs uppercase tracking-[0.16em] opacity-60">Mật khẩu</p><h2 className="mt-3 text-3xl tracking-[-0.04em]">{hasPassword ? "Đổi mật khẩu" : "Đặt mật khẩu"}</h2><div className="mt-6 grid max-w-lg gap-3">{hasPassword && <input className="border border-[var(--ink)] bg-transparent p-3 outline-none focus:ring-2 focus:ring-[var(--signal)]" name="currentPassword" type="password" placeholder="Mật khẩu hiện tại" required />}<input className="border border-[var(--ink)] bg-transparent p-3 outline-none focus:ring-2 focus:ring-[var(--signal)]" name="newPassword" type="password" minLength={12} placeholder="Mật khẩu mới (ít nhất 12 ký tự)" required /><button className="w-fit bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--paper)] hover:bg-[var(--signal)] hover:text-[var(--ink)]" type="submit">{hasPassword ? "Cập nhật mật khẩu" : "Đặt mật khẩu"}</button>{message && <p className="text-sm" role="status">{message}</p>}</div></form><article className="border border-[var(--ink)] bg-[var(--paper)] p-6 sm:p-8"><p className="font-mono text-xs uppercase tracking-[0.16em] opacity-60">Xác thực 2 bước</p><h2 className="mt-3 text-2xl">Thêm một lớp bảo vệ</h2><p className="mt-2 text-sm opacity-70">Tính năng đang được chuẩn bị.</p></article></div>}
        {activeTab === "sessions" && <article className="border border-[var(--ink)] bg-[var(--paper)] p-6 sm:p-8"><p className="font-mono text-xs uppercase tracking-[0.16em] opacity-60">Phiên đăng nhập</p><h2 className="mt-3 text-3xl tracking-[-0.04em]">Thiết bị đang hoạt động</h2><p className="mt-2 text-sm opacity-70">Thu hồi những phiên bạn không còn nhận ra hoặc sử dụng.</p><ul className="mt-8 divide-y divide-[var(--line)] border-y border-[var(--line)]">{sessions.map((session) => <li className="flex flex-wrap items-center justify-between gap-4 py-4" key={session.id}><div><p className="text-sm font-semibold">{session.current ? "Thiết bị này" : "Phiên đăng nhập"}</p><p className="mt-1 text-xs opacity-60">{new Date(session.createdAt).toLocaleString("vi-VN")}</p></div>{!session.current && <button className="text-sm underline underline-offset-4" type="button" onClick={() => void revokeSession(session.id).then(() => setSessions((items) => items.filter((item) => item.id !== session.id)))}>Thu hồi</button>}</li>)}</ul></article>}
      </div>
    </div>
  </section>;
}
