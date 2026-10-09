"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/components/auth-provider";
import { getNavigationItems } from "@/features/auth/permissions";
import { useEmailVerificationSetting } from "../hooks/use-email-verification-setting";
import { EmailVerificationSetting } from "./email-verification-setting";

// ponytail: Static reference only; verify against the backend catalog when it changes.
const defaultPermissions = [
  ["profile:read:self", true],
  ["profile:update:self", true],
  ["users:read", false],
  ["users:update", false],
  ["users:suspend", false],
  ["roles:manage", false],
  ["audit:read", false],
] as const;

export function SuperAdminWorkspace() {
  const tab = useSearchParams().get("tab");
  const { user, status } = useAuth();
  if (!user?.roles.includes("SUPER_ADMIN")) return null;
  if (tab === "email-verification")
    return <EmailVerificationSetting key={user.id} />;
  if (tab === "rbac") return <RbacReference />;
  return (
    <SuperAdminDashboard
      accountId={user.id}
      active={status === "authenticated"}
    />
  );
}

function SuperAdminDashboard({
  accountId,
  active,
}: {
  accountId: string;
  active: boolean;
}) {
  const { user } = useAuth();
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const invalidate = () => setBlocked(true);
    window.addEventListener("auth:requests-invalidated", invalidate);
    return () =>
      window.removeEventListener("auth:requests-invalidated", invalidate);
  }, []);
  useEffect(() => {
    setBlocked(false);
  }, [user]);
  const verified = active && !blocked;
  const query = useEmailVerificationSetting(accountId, verified);
  const navigation = getNavigationItems(user!.roles, user!.permissions);
  const cards = [
    {
      href: "/admin/users",
      title: "Người dùng",
      description: "Xem người dùng và cấp/thu hồi ADMIN.",
      marker: "U",
      action: "Mở người dùng",
    },
    {
      href: "/admin/audit-logs",
      title: "Nhật ký hệ thống",
      description: "Lọc hành động, UUID và tải thêm bằng cursor.",
      marker: "A",
      action: "Mở nhật ký hệ thống",
    },
    {
      href: "/super-admin?tab=email-verification",
      title: "Cài đặt xác thực email",
      description: !verified
        ? "Chưa thể xác minh phiên."
        : query.isError
          ? "Chưa thể tải trạng thái hiện tại."
          : query.isPending
            ? "Đang tải trạng thái..."
            : `Trạng thái hiện tại: ${query.data ? "Đang bật" : "Đang tắt"}.`,
      marker: "E",
      action: "Mở cài đặt xác thực email",
    },
    {
      href: "/account",
      title: "Tài khoản",
      description: "Thông tin, vai trò và phiên đăng nhập của bạn.",
      marker: "P",
      action: "Mở tài khoản",
    },
    {
      href: "/account/files",
      title: "Tệp của tôi",
      description: "Tệp riêng; tối đa 10 tệp và 5 MiB/tệp.",
      marker: "F",
      action: "Mở tệp của tôi",
    },
  ].filter((card) => navigation.some((item) => item.href === card.href));
  return (
    <section className="admin-view" aria-labelledby="super-admin-title">
      <header className="admin-heading">
        <h1 id="super-admin-title">Tổng quan siêu quản trị</h1>
        <p>Truy cập các tác vụ quản trị và không gian cá nhân.</p>
      </header>
      <div className="admin-notice">
        Không gian siêu quản trị
        <br />
        Chỉ SUPER_ADMIN thay đổi vai trò ADMIN và cài đặt email hệ thống.
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
            {card.marker === "E" && query.isError && verified ? (
              <Button
                variant="ghost"
                loading={query.isFetching}
                onClick={() => void query.refetch()}
              >
                Thử tải trạng thái
              </Button>
            ) : null}
          </Card>
        ))}
      </div>
      <p className="admin-muted">
        Quyền dựa trên tài khoản hiện tại.{" "}
        <Link href="/super-admin?tab=rbac">Xem catalog quyền mặc định</Link>.
      </p>
    </section>
  );
}

function RbacReference() {
  return (
    <section className="admin-view" aria-labelledby="rbac-title">
      <header className="admin-heading">
        <h1 id="rbac-title">Vai trò và quyền — chỉ đọc</h1>
        <p>
          Catalog mặc định đã đối chiếu với source. Đây không phải dữ liệu
          permission runtime trong DB.
        </p>
      </header>
      <Card>
        <h2>Permission catalog mặc định</h2>
        <div
          className="system-matrix-wrap"
          tabIndex={0}
          role="region"
          aria-label="Ma trận quyền mặc định, có thể cuộn ngang"
        >
          <table className="admin-table system-matrix">
            <caption className="sr-only">
              Quyền mặc định theo MEMBER, ADMIN và SUPER_ADMIN
            </caption>
            <thead>
              <tr>
                <th scope="col">Permission</th>
                <th scope="col">MEMBER</th>
                <th scope="col">ADMIN</th>
                <th scope="col">SUPER_ADMIN</th>
              </tr>
            </thead>
            <tbody>
              {defaultPermissions.map(([permission, member]) => (
                <tr key={permission}>
                  <th scope="row">{permission}</th>
                  <td>{member ? "Có" : "Không"}</td>
                  <td>Có</td>
                  <td>Có</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="admin-notice">
          Permission không đồng nghĩa có endpoint. Catalog không bổ sung chức
          năng sửa profile, sửa hoặc khóa người dùng.
        </p>
      </Card>
      <div className="admin-notice">
        ADMIN có roles:manage trong catalog, nhưng cấp/gỡ ADMIN cần đồng thời
        SUPER_ADMIN và roles:manage. Cài đặt email chỉ dành cho SUPER_ADMIN. Máy
        chủ luôn thực thi quyền cuối cùng.
      </div>
    </section>
  );
}
