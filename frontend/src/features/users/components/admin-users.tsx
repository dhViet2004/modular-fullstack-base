"use client";

import Link from "next/link";

import { useAuth } from "@/features/auth/components/auth-provider";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { EmailVerificationNotice } from "@/features/auth/components/email-verification-notice";
import { PERMISSIONS } from "@/features/auth/permissions";
import { useUsers } from "../hooks/use-users";
import { setAdminRole } from "../api/users.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Hiển thị các trạng thái loading, chưa đăng nhập, thiếu quyền và danh sách user.
export function AdminUsers() {
  const { user, isLoading } = useAuth();
  const canReadUsers =
    user?.permissions.includes(PERMISSIONS.USERS_READ) ?? false;
  const usersQuery = useUsers(canReadUsers);
  const queryClient = useQueryClient();
  const roleMutation = useMutation({ mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => setAdminRole(id, enabled), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }) });
  const canManageRoles = user?.roles.includes("SUPER_ADMIN") ?? false;

  if (isLoading) {
    return <p className="font-mono text-sm">Đang khôi phục phiên...</p>;
  }

  if (!user) {
    return (
      <p>
        Bạn chưa đăng nhập. <Link href="/login">Đăng nhập</Link>
      </p>
    );
  }

  if (!canReadUsers) {
    return (
      <section className="border border-[var(--ink)] bg-[var(--paper)] p-6">
        <p className="font-mono text-xs font-semibold tracking-[0.12em]">
          403 · FORBIDDEN
        </p>
        <h1 className="mt-2 text-4xl">Không có quyền truy cập</h1>
        <p className="mt-4">Tài khoản cần permission `users:read`.</p>
      </section>
    );
  }

  if (usersQuery.isPending) {
    return <p className="font-mono text-sm">Đang tải người dùng...</p>;
  }

  if (usersQuery.isError) {
    return <p role="alert">Không thể tải danh sách người dùng.</p>;
  }

  return (
    <section>
      <EmailVerificationNotice />
      <header className="mb-8 flex items-end justify-between gap-4 border-b border-[var(--ink)] pb-5">
        <div>
          <p className="font-mono text-xs font-semibold tracking-[0.12em]">
            USERS:READ
          </p>
          <h1 className="mt-2 text-5xl tracking-[-0.05em]">Người dùng</h1>
        </div>
        <div className="grid justify-items-end gap-1 text-right font-mono text-sm">
          <Link className="underline underline-offset-4" href="/admin/audit-logs">
            Audit log
          </Link>
          <span>{usersQuery.data.length} tài khoản</span>
          <LogoutButton />
        </div>
      </header>

      <div className="overflow-x-auto border border-[var(--ink)] bg-[var(--paper)]">
        <table className="w-full border-collapse text-left">
          <thead className="bg-[var(--ink)] font-mono text-xs text-[var(--paper)] uppercase">
            <tr>
              <th className="p-4">Người dùng</th>
              <th className="p-4">Trạng thái</th>
              <th className="p-4">Role</th>
              {canManageRoles && <th className="p-4">Quản lý</th>}
            </tr>
          </thead>
          <tbody>
            {usersQuery.data.map((listedUser) => (
              <tr className="border-t border-[var(--ink)]" key={listedUser.id}>
                <td className="p-4">
                  <strong className="block">
                    {listedUser.displayName ?? "Chưa đặt tên"}
                  </strong>
                  <span className="text-sm">{listedUser.email}</span>
                </td>
                <td className="p-4 font-mono text-xs">{listedUser.status}</td>
                <td className="p-4 font-mono text-xs">
                  {listedUser.roles.join(", ") || "—"}
                </td>
                {canManageRoles && <td className="p-4"><button type="button" disabled={roleMutation.isPending} onClick={() => roleMutation.mutate({ id: listedUser.id, enabled: !listedUser.roles.includes("ADMIN") })} className="underline">{listedUser.roles.includes("ADMIN") ? "Thu hồi ADMIN" : "Cấp ADMIN"}</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
