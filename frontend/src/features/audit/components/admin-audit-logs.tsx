"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InlineAlert, Skeleton } from "@/components/ui/feedback";
import { DetailsDrawer } from "@/components/ui/details-drawer";
import { useAuth } from "@/features/auth/components/auth-provider";
import { canReadAuditLogs } from "@/features/auth/permissions";
import { useAuditLogs } from "../hooks/use-audit-logs";
import {
  AUDIT_ACTIONS,
  type AuditFilters,
  type AuditLog,
} from "../api/audit.api";

const filterSchema = z.object({
  action: z.enum(["", ...AUDIT_ACTIONS]),
  actorUserId: z
    .string()
    .trim()
    .refine(
      (value) => !value || z.string().uuid().safeParse(value).success,
      "Nhập UUID hợp lệ.",
    ),
  limit: z
    .string()
    .trim()
    .regex(/^\d+$/, "Nhập số nguyên từ 1 đến 100.")
    .transform(Number)
    .pipe(
      z
        .number()
        .int()
        .min(1, "Tối thiểu 1 bản ghi.")
        .max(100, "Tối đa 100 bản ghi."),
    ),
});
const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "medium",
});
const empty = "Không có dữ liệu";

export function AdminAuditLogs() {
  const { user, isLoading, status } = useAuth();
  if (isLoading) return <p role="status">Đang khôi phục phiên...</p>;
  if (!user)
    return (
      <p role="alert">
        401 · Bạn chưa đăng nhập. <Link href="/login">Đăng nhập</Link>
      </p>
    );
  if (!canReadAuditLogs(user.permissions)) return <AuditForbidden />;
  return (
    <AuditContent
      key={user.id}
      accountId={user.id}
      active={status === "authenticated"}
      verifying={status === "loading"}
    />
  );
}

function AuditForbidden() {
  return (
    <section className="admin-view">
      <header className="admin-heading">
        <h1>Nhật ký hệ thống</h1>
      </header>
      <Card className="admin-empty" role="alert">
        <span className="admin-muted">403 · FORBIDDEN</span>
        <h2>Bạn không có quyền truy cập</h2>
        <p>Quyền xem nhật ký hệ thống không còn khả dụng.</p>
        <Link className="ui-button admin-link-button" href="/account">
          Về trang của tôi
        </Link>
      </Card>
    </section>
  );
}

function AuditContent({
  accountId,
  active,
  verifying,
}: {
  accountId: string;
  active: boolean;
  verifying: boolean;
}) {
  const [applied, setApplied] = useState<AuditFilters>({ limit: 50 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const loadingMore = useRef(false);
  const form = useForm<
    z.input<typeof filterSchema>,
    unknown,
    z.output<typeof filterSchema>
  >({
    resolver: zodResolver(filterSchema),
    defaultValues: { action: "", actorUserId: "", limit: "50" },
  });
  const auditQuery = useAuditLogs(accountId, applied, active);
  const logs = auditQuery.data?.pages.flatMap((page) => page.auditLogs) ?? [];
  const selected = logs.find((log) => log.id === selectedId);
  const forbidden =
    axios.isAxiosError(auditQuery.error) &&
    auditQuery.error.response?.status === 403;
  if (forbidden) return <AuditForbidden />;

  async function loadMore() {
    if (
      loadingMore.current ||
      !active ||
      auditQuery.isFetching ||
      !auditQuery.hasNextPage
    )
      return;
    loadingMore.current = true;
    try {
      await auditQuery.fetchNextPage({ cancelRefetch: false });
    } finally {
      loadingMore.current = false;
    }
  }

  return (
    <section className="admin-view" aria-labelledby="audit-title">
      <header className="admin-heading">
        <h1 id="audit-title" ref={heading} tabIndex={-1}>
          Nhật ký hệ thống
        </h1>
        <p>Theo dõi sự kiện bảo mật và quản trị.</p>
      </header>
      {verifying ? (
        <Card role="status">
          <Skeleton />
          <p>Đang khôi phục phiên...</p>
        </Card>
      ) : (
        <Card>
          <h2>Nhật ký hệ thống</h2>
          <p className="admin-muted">Sự kiện bảo mật và quản trị · vi-VN</p>
          <form
            className="admin-filters"
            noValidate
            onSubmit={form.handleSubmit((values) => {
              if (!active) return;
              setSelectedId(null);
              setApplied({
                limit: values.limit,
                ...(values.action ? { action: values.action } : {}),
                ...(values.actorUserId
                  ? { actorUserId: values.actorUserId }
                  : {}),
              });
            })}
          >
            <Input
              id="audit-action"
              type="select"
              label="Hành động"
              {...form.register("action")}
              error={form.formState.errors.action?.message}
            >
              <option value="">Tất cả hành động</option>
              {AUDIT_ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </Input>
            <Input
              id="audit-actor"
              label="Người thực hiện (UUID)"
              placeholder="Nhập người thực hiện (UUID)"
              hint="Tìm bằng UUID, không tìm theo tên."
              {...form.register("actorUserId")}
              error={form.formState.errors.actorUserId?.message}
            />
            <Input
              id="audit-limit"
              label="Số bản ghi"
              inputMode="numeric"
              hint="Từ 1–100; mặc định 50."
              {...form.register("limit")}
              error={form.formState.errors.limit?.message}
            />
            <Button
              type="submit"
              variant="secondary"
              loading={form.formState.isSubmitting}
              disabled={!active}
            >
              Áp dụng bộ lọc
            </Button>
          </form>
          {auditQuery.isPending ? (
            <div role="status" aria-label="Đang tải nhật ký">
              <Skeleton />
              <Skeleton />
              <Skeleton />
              <p className="admin-muted">Đang tải dữ liệu...</p>
            </div>
          ) : (
            <>
              {auditQuery.isError && !auditQuery.isFetchNextPageError ? (
                <InlineAlert>
                  Không thể tải nhật ký hệ thống.
                  <Button
                    variant="secondary"
                    disabled={!active}
                    loading={auditQuery.isFetching}
                    onClick={() => void auditQuery.refetch()}
                  >
                    Thử lại
                  </Button>
                </InlineAlert>
              ) : null}
              {auditQuery.data ? (
                logs.length ? (
                  <>
                    <div className="admin-table-wrap">
                      <table className="admin-table admin-audit-table">
                        <thead>
                          <tr>
                            <th>Thời điểm</th>
                            <th>Hành động / Kết quả</th>
                            <th>Actor / Subject</th>
                            <th>IP / User agent</th>
                            <th>Chi tiết</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logs.map((log) => (
                            <tr key={log.id} data-audit-id={log.id}>
                              <td>
                                {dateFormatter.format(new Date(log.createdAt))}
                              </td>
                              <td>
                                <strong>{log.action}</strong>
                                <br />
                                <span
                                  className="admin-badge"
                                  data-outcome={log.outcome}
                                >
                                  {log.outcome}
                                </span>
                              </td>
                              <td>
                                {log.actorUserId ?? empty}
                                <br />
                                {log.subjectType ?? empty}:{" "}
                                {log.subjectId ?? empty}
                              </td>
                              <td>
                                {log.ipAddress ?? empty}
                                <br />
                                {log.userAgent ?? empty}
                              </td>
                              <td>
                                <Button
                                  variant="ghost"
                                  onClick={() => setSelectedId(log.id)}
                                  aria-label={"Xem chi tiết sự kiện " + log.id}
                                >
                                  Xem chi tiết
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="admin-mobile-list">
                      {logs.map((log) => (
                        <div
                          className="admin-mobile-card"
                          key={log.id}
                          data-audit-id={log.id}
                        >
                          <strong>
                            {dateFormatter.format(new Date(log.createdAt))}
                            <br />
                            {log.action}
                          </strong>
                          <span
                            className="admin-badge"
                            data-outcome={log.outcome}
                          >
                            {log.outcome}
                          </span>
                          <p>
                            Actor: {log.actorUserId ?? empty}
                            <br />
                            Subject: {log.subjectType ?? empty}:{" "}
                            {log.subjectId ?? empty}
                            <br />
                            IP: {log.ipAddress ?? empty}
                            <br />
                            User agent: {log.userAgent ?? empty}
                          </p>
                          <Button
                            variant="secondary"
                            onClick={() => setSelectedId(log.id)}
                          >
                            Xem chi tiết
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="admin-empty" role="status">
                    <h2>
                      {applied.action || applied.actorUserId
                        ? "Không có sự kiện phù hợp"
                        : "Chưa có sự kiện"}
                    </h2>
                    <p>
                      {applied.action || applied.actorUserId
                        ? "Thay đổi bộ lọc để xem các sự kiện khác."
                        : "Sự kiện mới sẽ hiển thị tại đây khi có dữ liệu."}
                    </p>
                  </div>
                )
              ) : null}
              {auditQuery.isFetchNextPageError ? (
                <InlineAlert>
                  Không thể tải thêm. Các sự kiện đã tải vẫn được giữ.
                </InlineAlert>
              ) : null}
              {auditQuery.hasNextPage ? (
                <div>
                  <Button
                    variant="secondary"
                    disabled={!active || auditQuery.isFetching}
                    loading={auditQuery.isFetchingNextPage}
                    onClick={() => void loadMore()}
                  >
                    {auditQuery.isFetchingNextPage
                      ? "Đang tải thêm..."
                      : auditQuery.isFetchNextPageError
                        ? "Thử tải thêm"
                        : "Tải thêm"}
                  </Button>
                </div>
              ) : null}
            </>
          )}
          <p className="admin-muted">
            Nhật ký chỉ đọc. Tải thêm để xem sự kiện cũ hơn.
          </p>
          {selected ? (
            <DetailsDrawer
              title="Chi tiết sự kiện"
              onClose={() => setSelectedId(null)}
              fallbackFocusRef={heading}
            >
              <AuditDetails key={selected.id} log={selected} />
            </DetailsDrawer>
          ) : null}
        </Card>
      )}
    </section>
  );
}

function AuditDetails({ log }: { log: AuditLog }) {
  const [copy, setCopy] = useState<"idle" | "pending" | "success" | "error">(
    "idle",
  );
  async function copyId() {
    if (copy === "pending") return;
    setCopy("pending");
    try {
      await navigator.clipboard.writeText(log.id);
      setCopy("success");
    } catch {
      setCopy("error");
    }
  }
  const fields = [
    ["ID", log.id],
    ["Hành động / Kết quả", log.action + " / " + log.outcome],
    ["Actor UUID", log.actorUserId ?? empty],
    [
      "Subject type / ID",
      (log.subjectType ?? empty) + " / " + (log.subjectId ?? empty),
    ],
    ["Session ID", log.sessionId ?? empty],
    [
      "IP / User agent",
      (log.ipAddress ?? empty) + " / " + (log.userAgent ?? empty),
    ],
    ["Thời điểm", dateFormatter.format(new Date(log.createdAt))],
  ];
  return (
    <>
      <Button
        variant="secondary"
        loading={copy === "pending"}
        onClick={() => void copyId()}
      >
        Sao chép ID
      </Button>
      {copy === "success" ? (
        <p role="status">Đã sao chép ID.</p>
      ) : copy === "error" ? (
        <InlineAlert>
          Không thể sao chép. Bạn có thể chọn ID để sao chép thủ công.
        </InlineAlert>
      ) : null}
      <dl className="admin-detail-fields">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        <div>
          <dt>Metadata</dt>
          <dd>
            <pre>
              {log.metadata == null
                ? empty
                : JSON.stringify(log.metadata, null, 2)}
            </pre>
          </dd>
        </div>
      </dl>
      <p className="admin-muted">Nhật ký chỉ đọc.</p>
    </>
  );
}
