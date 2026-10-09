"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { getNavigationItems } from "../permissions";
import type { AuthenticatedUser } from "../api/auth.api";
import { Card } from "@/components/ui/card";
import { useAuth } from "./auth-provider";

export function RoleDashboard({
  role,
  children,
}: {
  role: "ADMIN" | "SUPER_ADMIN";
  children?: ReactNode;
}) {
  const { user, isLoading, status } = useAuth();
  if (isLoading || status === "loading")
    return <p role="status">Đang tải thông tin quyền...</p>;
  if (!user)
    return (
      <p role="alert">
        401 · Bạn chưa đăng nhập. <Link href="/login">Đăng nhập</Link>
      </p>
    );
  if (!user.roles.includes(role))
    return <p role="alert">403 · Bạn không có quyền truy cập trang này.</p>;

  if (role === "ADMIN") return <AdminDashboard user={user} />;

  return children;
}

function AdminDashboard({ user }: { user: AuthenticatedUser }) {
  const navigation = getNavigationItems(user.roles, user.permissions);
  const cards = [
    {
      href: "/admin/users",
      title: "Người dùng",
      description: "Xem thông tin người dùng, chỉ đọc.",
      action: "Mở người dùng",
      marker: "U",
    },
    {
      href: "/admin/audit-logs",
      title: "Nhật ký hệ thống",
      description: "Lọc hành động, UUID và tải thêm bằng cursor.",
      action: "Mở nhật ký hệ thống",
      marker: "A",
    },
    {
      href: "/account",
      title: "Tài khoản",
      description: "Thông tin, vai trò và phiên đăng nhập của bạn.",
      action: "Mở tài khoản",
      marker: "P",
    },
    {
      href: "/account/files",
      title: "Tệp của tôi",
      description: "Tệp riêng; tối đa 10 tệp và 5 MiB/tệp.",
      action: "Mở tệp của tôi",
      marker: "F",
    },
  ].filter((card) => navigation.some((item) => item.href === card.href));

  return (
    <section className="admin-view" aria-labelledby="admin-dashboard-title">
      <header className="admin-heading">
        <h1 id="admin-dashboard-title">Tổng quan quản trị</h1>
        <p>Theo dõi người dùng và hoạt động bảo mật.</p>
      </header>
      <div className="admin-notice">
        Không gian quản trị · Chỉ đọc
        <br />
        Bạn chỉ xem users/audit; tác vụ cá nhân thuộc tài khoản của mình.
      </div>
      <div className="admin-dashboard-grid">
        {cards.map((card) => (
          <Card key={card.href}>
            {/* ponytail: Text markers until original Figma icons are available. */}
            <span className="admin-card-marker" aria-hidden="true">
              {card.marker}
            </span>
            <div>
              <h2>{card.title}</h2>
              <p>{card.description}</p>
            </div>
            <Link
              className="ui-button admin-link-button"
              data-variant="secondary"
              href={card.href}
            >
              {card.action}
            </Link>
          </Card>
        ))}
      </div>
      <p className="admin-muted">
        Quyền dựa trên tài khoản hiện tại. Các liên kết quản trị chỉ xuất hiện
        khi được cấp quyền.
      </p>
    </section>
  );
}
