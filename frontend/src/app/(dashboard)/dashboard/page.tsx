"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiActivity, FiArrowRight, FiClock, FiFolder, FiMail, FiSettings, FiShield, FiUsers } from "react-icons/fi";
import { PageHead } from "@/components/shared/page-head";
import { authClient, type AuthUser } from "@/lib/auth/auth-client";
import { usePermissions } from "@/lib/auth/use-permission";
import { filesApi } from "@/features/files/api/files.api";
import { jobsApi } from "@/features/jobs/api/jobs.api";
import { mailApi } from "@/features/mail/api/mail.api";
import { sessionsApi } from "@/features/sessions/api/sessions.api";
import { usersApi } from "@/features/users/api/users.api";

type OverviewCard = { href: string; title: string; description: string; value: string; detail: string; icon: ReactNode; tone: "brand" | "success" | "warn" | "danger"; loading?: boolean; error?: boolean };

const roleLabel = (user: AuthUser | null) => {
  const role = user?.roles?.[0]?.name;
  if (role === "SUPER_ADMIN") return "Super Admin";
  if (role === "ADMIN") return "Admin";
  if (role === "MEMBER") return "Thành viên";
  return role || "Thành viên";
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(authClient.getUser());
    usersApi.me().then((fresh) => {
      authClient.updateUser(fresh);
      setUser(fresh);
    }).finally(() => setReady(true));
  }, []);

  const { hasPermission, permissions, isSuperAdmin } = usePermissions(user);
  const canReadUsers = ready && hasPermission("users.read");
  const canReadRoles = ready && hasPermission("users.roles.read");
  const canReadFiles = ready && hasPermission("files.read");
  const canReadMail = ready && hasPermission("mail.read");
  const canReadJobs = ready && hasPermission("jobs.read");
  const canReadSessions = ready && hasPermission("sessions.read");
  const canReadSettings = ready && hasPermission("system.settings.read");

  const users = useQuery({ queryKey: ["dashboard", "users"], queryFn: usersApi.list, enabled: canReadUsers });
  const roles = useQuery({ queryKey: ["dashboard", "roles"], queryFn: usersApi.getRoles, enabled: canReadRoles });
  const files = useQuery({ queryKey: ["dashboard", "files"], queryFn: filesApi.list, enabled: canReadFiles });
  const mail = useQuery({ queryKey: ["dashboard", "mail"], queryFn: mailApi.list, enabled: canReadMail });
  const jobs = useQuery({ queryKey: ["dashboard", "jobs"], queryFn: jobsApi.list, enabled: canReadJobs });
  const sessions = useQuery({ queryKey: ["dashboard", "sessions"], queryFn: sessionsApi.list, enabled: canReadSessions });

  const cards = useMemo<OverviewCard[]>(() => {
    const result: OverviewCard[] = [];
    if (canReadUsers) {
      const active = users.data?.filter((item) => item.status === "ACTIVE").length ?? 0;
      result.push({ href: "/users?tab=users", title: "Người dùng", description: "Tài khoản và trạng thái truy cập", value: String(users.data?.length ?? 0), detail: `${active} tài khoản đang hoạt động`, icon: <FiUsers size={22} />, tone: "brand", loading: users.isLoading, error: users.isError });
    }
    if (canReadRoles) result.push({ href: "/users?tab=roles", title: "Vai trò & phân quyền", description: "Nhóm quyền đang được cấu hình", value: String(roles.data?.roles.length ?? 0), detail: `${roles.data?.permissions.length ?? 0} quyền trong hệ thống`, icon: <FiShield size={22} />, tone: "success", loading: roles.isLoading, error: roles.isError });
    if (canReadFiles) {
      const bytes = files.data?.reduce((sum, file) => sum + (file.object?.size ?? 0), 0) ?? 0;
      result.push({ href: "/files", title: "Tệp tin", description: "Kho lưu trữ và công cụ Markdown", value: String(files.data?.length ?? 0), detail: `${formatSize(bytes)} đang lưu trữ`, icon: <FiFolder size={22} />, tone: "warn", loading: files.isLoading, error: files.isError });
    }
    if (canReadMail) {
      const sent = mail.data?.items.filter((item) => item.action === "MAIL_SENT").length ?? 0;
      result.push({ href: "/mail", title: "Email", description: "Gửi thư, lịch sử và mẫu email", value: String(mail.data?.total ?? 0), detail: `${sent} email gửi thành công gần đây`, icon: <FiMail size={22} />, tone: "danger", loading: mail.isLoading, error: mail.isError });
    }
    if (canReadJobs) {
      const active = jobs.data?.filter((job) => job.enabled).length ?? 0;
      result.push({ href: "/jobs", title: "Công việc định kỳ", description: "Lịch chạy và tác vụ nền", value: String(jobs.data?.length ?? 0), detail: `${active} lịch đang hoạt động`, icon: <FiClock size={22} />, tone: "brand", loading: jobs.isLoading, error: jobs.isError });
    }
    if (canReadSessions) result.push({ href: "/sessions", title: "Phiên đăng nhập", description: "Thiết bị và truy cập an toàn", value: String(sessions.data?.length ?? 0), detail: "Phiên đang hoạt động của bạn", icon: <FiActivity size={22} />, tone: "success", loading: sessions.isLoading, error: sessions.isError });
    if (canReadSettings) result.push({ href: "/settings", title: "Cài đặt hệ thống", description: "Cấu hình và tùy chọn vận hành", value: "Sẵn sàng", detail: "Mở cấu hình hệ thống", icon: <FiSettings size={22} />, tone: "warn" });
    return result;
  }, [canReadUsers, canReadRoles, canReadFiles, canReadMail, canReadJobs, canReadSessions, canReadSettings, users.data, users.isLoading, users.isError, roles.data, roles.isLoading, roles.isError, files.data, files.isLoading, files.isError, mail.data, mail.isLoading, mail.isError, jobs.data, jobs.isLoading, jobs.isError, sessions.data, sessions.isLoading, sessions.isError]);

  return <>
    <PageHead title="Tổng quan hệ thống" description="Theo dõi nhanh các khu vực bạn được phép truy cập trong CoreStack." />
    <section className="dashboard-access-summary">
      <div><span>Phạm vi truy cập hiện tại</span><strong>{roleLabel(user)}</strong><p>{isSuperAdmin ? "Toàn quyền quản trị hệ thống" : `${permissions.length} quyền hiệu lực theo RBAC`}</p></div>
      <div><span>Menu có thể truy cập</span><strong>{ready ? cards.length : "…"}</strong><p>Nội dung được lọc theo quyền của tài khoản</p></div>
    </section>
    {!ready ? <div className="loading">Đang tải phạm vi quyền và dữ liệu tổng quan…</div> : cards.length === 0 ? (
      <section className="panel empty"><FiShield size={36} /><h2>Chưa có menu quản trị được cấp quyền</h2><p>Liên hệ quản trị viên để được gán vai trò hoặc quyền truy cập phù hợp.</p></section>
    ) : (
      <section className="dashboard-overview-grid" aria-label="Các menu được phép truy cập">
        {cards.map((card) => <Link className="dashboard-overview-card" href={card.href} key={card.href}>
          <div className={`dashboard-overview-icon ${card.tone}`}>{card.icon}</div>
          <div className="dashboard-overview-content">
            <div className="dashboard-overview-title"><h2>{card.title}</h2><FiArrowRight size={17} /></div>
            <p>{card.description}</p>
            <div className="dashboard-overview-value"><strong>{card.loading ? "…" : card.error ? "—" : card.value}</strong><span>{card.error ? "Không thể tải dữ liệu" : card.detail}</span></div>
          </div>
        </Link>)}
      </section>
    )}
  </>;
}
