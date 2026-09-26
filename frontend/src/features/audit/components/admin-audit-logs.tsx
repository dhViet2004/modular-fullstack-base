"use client";

import Link from "next/link";

import { useAuth } from "@/features/auth/components/auth-provider";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { canReadAuditLogs } from "@/features/auth/permissions";
import { useAuditLogs } from "../hooks/use-audit-logs";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "medium",
});

// Hiển thị timeline audit với đầy đủ trạng thái auth, quyền, tải dữ liệu và phân trang.
export function AdminAuditLogs() {
  const { user, isLoading } = useAuth();
  const canReadAudit = user ? canReadAuditLogs(user.permissions) : false;
  const auditQuery = useAuditLogs(canReadAudit);

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

  if (!canReadAudit) {
    return (
      <section className="border border-[var(--ink)] bg-[var(--paper)] p-6">
        <p className="font-mono text-xs font-semibold tracking-[0.12em]">
          403 · FORBIDDEN
        </p>
        <h1 className="mt-2 text-4xl">Không có quyền truy cập</h1>
        <p className="mt-4">Tài khoản cần permission `audit:read`.</p>
      </section>
    );
  }

  if (auditQuery.isPending) {
    return <p className="font-mono text-sm">Đang tải audit log...</p>;
  }

  if (auditQuery.isError) {
    return <p role="alert">Không thể tải audit log.</p>;
  }

  const auditLogs = auditQuery.data.pages.flatMap((page) => page.auditLogs);

  return (
    <section>
      <header className="mb-8 flex items-end justify-between gap-4 border-b border-[var(--ink)] pb-5">
        <div>
          <p className="font-mono text-xs font-semibold tracking-[0.12em]">
            AUDIT:READ
          </p>
          <h1 className="mt-2 text-5xl tracking-[-0.05em]">Audit log</h1>
        </div>
        <div className="grid justify-items-end gap-2">
          <Link className="font-mono text-sm underline underline-offset-4" href="/admin/users">
            Người dùng
          </Link>
          <LogoutButton />
        </div>
      </header>

      {auditLogs.length === 0 ? (
        <p className="border border-[var(--ink)] p-6">Chưa có audit event.</p>
      ) : (
        <div className="overflow-x-auto border border-[var(--ink)] bg-[var(--paper)]">
          <table className="w-full border-collapse text-left">
            <thead className="bg-[var(--ink)] font-mono text-xs text-[var(--paper)] uppercase">
              <tr>
                <th className="p-4">Thời gian</th>
                <th className="p-4">Sự kiện</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Subject</th>
                <th className="p-4">IP</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((auditLog) => (
                <tr className="border-t border-[var(--ink)]" key={auditLog.id}>
                  <td className="whitespace-nowrap p-4 font-mono text-xs">
                    {dateFormatter.format(new Date(auditLog.createdAt))}
                  </td>
                  <td className="p-4">
                    <strong className="block font-mono text-xs">
                      {auditLog.action}
                    </strong>
                    <span className="text-sm">{auditLog.outcome}</span>
                  </td>
                  <td className="p-4 font-mono text-xs">
                    {auditLog.actorUserId ?? "—"}
                  </td>
                  <td className="p-4 font-mono text-xs">
                    {auditLog.subjectType && auditLog.subjectId
                      ? `${auditLog.subjectType}:${auditLog.subjectId}`
                      : "—"}
                  </td>
                  <td className="p-4 font-mono text-xs">
                    {auditLog.ipAddress ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {auditQuery.hasNextPage ? (
        <button
          className="mt-5 min-h-11 border border-[var(--ink)] bg-[var(--ink)] px-5 font-mono text-xs font-semibold text-[var(--paper)] uppercase disabled:opacity-60"
          type="button"
          disabled={auditQuery.isFetchingNextPage}
          onClick={() => auditQuery.fetchNextPage()}
        >
          {auditQuery.isFetchingNextPage ? "Đang tải..." : "Tải thêm"}
        </button>
      ) : null}
    </section>
  );
}
