"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/controls";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InlineAlert, Progress, Skeleton } from "@/components/ui/feedback";
import { useAuth } from "@/features/auth/components/auth-provider";
import { getAuthRequestVersion } from "@/lib/auth/access-token";
import { queryKeys } from "@/lib/query/query-keys";
import { setEmailVerificationSetting } from "../api/system.api";
import { useEmailVerificationSetting } from "../hooks/use-email-verification-setting";

export function EmailVerificationSetting() {
  const { user } = useAuth();
  if (!user?.roles.includes("SUPER_ADMIN")) return null;
  return <SettingContent key={user.id} accountId={user.id} />;
}

function SettingContent({ accountId }: { accountId: string }) {
  const { user, status, retrySession } = useAuth();
  const client = useQueryClient();
  const [blocked, setBlocked] = useState(false);
  const [intent, setIntent] = useState<boolean | null>(null);
  const [result, setResult] = useState<{
    type: "success" | "error" | "unknown" | "forbidden";
    target: boolean;
  } | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const active = status === "authenticated" && !blocked;
  const query = useEmailVerificationSetting(
    accountId,
    active && result?.type !== "forbidden",
  );
  const heading = useRef<HTMLHeadingElement>(null);
  const alive = useRef(false);
  const busy = useRef(false);
  const request = useRef<AbortController | null>(null);
  const mutation = useMutation({
    mutationFn: ({
      enabled,
      signal,
    }: {
      enabled: boolean;
      signal: AbortSignal;
    }) => setEmailVerificationSetting(enabled, signal),
    retry: false,
  });
  useEffect(() => {
    alive.current = true;
    const invalidate = () => {
      request.current?.abort();
      setBlocked(true);
      setIntent(null);
      setResult(null);
      setReconciling(false);
    };
    window.addEventListener("auth:requests-invalidated", invalidate);
    return () => {
      alive.current = false;
      request.current?.abort();
      window.removeEventListener("auth:requests-invalidated", invalidate);
    };
  }, []);
  useEffect(() => {
    setBlocked(false);
  }, [user]);
  useEffect(() => {
    if (!active) {
      request.current?.abort();
      setIntent(null);
    }
  }, [active]);

  async function reconcile(target: boolean, version: number) {
    setReconciling(true);
    const refreshed = await query.refetch({ throwOnError: false });
    if (!alive.current || version !== getAuthRequestVersion()) return;
    setReconciling(false);
    if (
      axios.isAxiosError(refreshed.error) &&
      refreshed.error.response?.status === 403
    )
      setResult({ type: "forbidden", target });
    else
      setResult({
        type: refreshed.isError
          ? "unknown"
          : refreshed.data === target
            ? "success"
            : "error",
        target,
      });
  }

  async function save() {
    if (
      busy.current ||
      !active ||
      intent === null ||
      query.isFetching ||
      query.isError ||
      result?.type === "unknown"
    )
      return;
    busy.current = true;
    const target = intent;
    const version = getAuthRequestVersion();
    const controller = new AbortController();
    request.current = controller;
    setResult(null);
    // Finish reads before writing so an older GET cannot overwrite the verified response.
    await client.cancelQueries({
      queryKey: queryKeys.system.emailVerification(accountId),
      exact: true,
    });
    try {
      if (controller.signal.aborted || version !== getAuthRequestVersion())
        return;
      const enabled = await mutation.mutateAsync({
        enabled: target,
        signal: controller.signal,
      });
      if (
        !alive.current ||
        controller.signal.aborted ||
        version !== getAuthRequestVersion()
      )
        return;
      client.setQueryData(
        queryKeys.system.emailVerification(accountId),
        enabled,
      );
      setIntent(null);
      setResult({ type: enabled === target ? "success" : "error", target });
    } catch (error) {
      if (
        !alive.current ||
        controller.signal.aborted ||
        version !== getAuthRequestVersion() ||
        axios.isCancel(error)
      )
        return;
      setIntent(null);
      const code = axios.isAxiosError(error)
        ? error.response?.status
        : undefined;
      if (code === 401) retrySession();
      else if (code === 403) setResult({ type: "forbidden", target });
      else if (code && code < 500 && code !== 408)
        setResult({ type: "error", target });
      else {
        setResult({ type: "unknown", target });
        await reconcile(target, version);
      }
    } finally {
      busy.current = false;
      if (request.current === controller) request.current = null;
    }
  }

  async function checkAgain() {
    if (busy.current || !active || !result) return;
    busy.current = true;
    try {
      await reconcile(result.target, getAuthRequestVersion());
    } finally {
      busy.current = false;
    }
  }

  const forbidden =
    result?.type === "forbidden" ||
    (axios.isAxiosError(query.error) && query.error.response?.status === 403);
  const saving = mutation.isPending || reconciling;
  const label = (enabled: boolean) => (enabled ? "Đang bật" : "Đang tắt");
  return (
    <section className="admin-view" aria-labelledby="email-setting-title">
      <header className="admin-heading">
        <h1 id="email-setting-title" tabIndex={-1} ref={heading}>
          Cài đặt xác thực email
        </h1>
        <p>Quản lý chính sách xác thực email của hệ thống.</p>
      </header>
      <div className="admin-notice">
        Chỉ dành cho Siêu quản trị viên
        <br />
        Giá trị hiện tại được lấy từ cài đặt hệ thống. Máy chủ quyết định quyền
        thực hiện thay đổi.
      </div>
      {!active || query.isPending ? (
        <Card role="status" aria-label="Đang tải cấu hình email">
          <Skeleton />
          <Skeleton />
          <p>
            {!active
              ? "Đang xác minh phiên và quyền truy cập..."
              : "Đang tải cấu hình email..."}
          </p>
        </Card>
      ) : forbidden ? (
        <Card className="admin-empty" role="alert">
          <span>403 · FORBIDDEN</span>
          <h2>Bạn không có quyền thay đổi cài đặt</h2>
          <p>Hãy xác minh lại quyền SUPER_ADMIN của tài khoản.</p>
          <Button onClick={retrySession}>Kiểm tra lại quyền</Button>
        </Card>
      ) : (
        <>
          {query.data !== undefined ? (
            <Card>
              <h2>Yêu cầu xác thực email</h2>
              <p className="admin-muted">
                Thiết lập này áp dụng cho chính sách xác thực email của hệ
                thống.
              </p>
              <div className="system-setting-control">
                <div>
                  <span
                    className="admin-badge"
                    data-outcome={query.data ? "SUCCESS" : "OFF"}
                  >
                    {label(query.data)}
                  </span>
                  <p className="admin-muted">
                    Giá trị cuối đã xác minh từ máy chủ.
                  </p>
                </div>
                <Switch
                  label={
                    <span className="sr-only">Yêu cầu xác thực email</span>
                  }
                  checked={query.data}
                  disabled={
                    saving ||
                    query.isFetching ||
                    query.isError ||
                    result?.type === "unknown"
                  }
                  onChange={() => {
                    if (!busy.current) setIntent(!query.data);
                  }}
                />
              </div>
              <p className="admin-muted">
                Không đăng xuất tài khoản hiện hữu hoặc thay đổi dữ liệu xác
                minh trước đây.
              </p>
              {saving ? (
                <div role="status">
                  <Progress
                    label={
                      reconciling
                        ? "Đang kiểm tra trạng thái"
                        : "Đang lưu thiết lập"
                    }
                  />
                  <p>
                    {reconciling
                      ? "Đang kiểm tra trạng thái trên máy chủ..."
                      : "Đang lưu thiết lập..."}
                  </p>
                </div>
              ) : null}
            </Card>
          ) : null}
          {result?.type === "unknown" ? (
            <InlineAlert>
              Chưa xác định được trạng thái sau khi lưu. Giá trị cuối đã xác
              minh được giữ để tham khảo; chưa gửi lại thay đổi.
              <Button
                variant="secondary"
                loading={saving}
                onClick={() => void checkAgain()}
              >
                Kiểm tra lại trạng thái
              </Button>
            </InlineAlert>
          ) : result?.type === "error" ? (
            <InlineAlert>
              Chưa lưu được thay đổi mong muốn. Hãy kiểm tra giá trị đã xác minh
              trước khi thử lại.
              <Button
                variant="secondary"
                disabled={saving || query.isError || query.isFetching}
                onClick={() => setIntent(result.target)}
              >
                Thử lại thay đổi
              </Button>
            </InlineAlert>
          ) : result?.type === "success" ? (
            <InlineAlert variant="success">
              Đã xác nhận cài đặt: {label(query.data ?? result.target)}.
            </InlineAlert>
          ) : null}
          {query.isError && result?.type !== "unknown" ? (
            <InlineAlert>
              Không thể tải cấu hình email.
              <Button
                variant="secondary"
                loading={query.isFetching}
                onClick={() => void query.refetch()}
              >
                Thử tải lại
              </Button>
            </InlineAlert>
          ) : null}
          <ConfirmDialog
            open={intent !== null}
            title={
              intent
                ? "Bật yêu cầu xác thực email?"
                : "Tắt yêu cầu xác thực email?"
            }
            description={
              <>
                <p>
                  Xác nhận để lưu trạng thái mới cho chính sách xác thực email
                  của hệ thống.
                </p>
                <dl className="admin-detail-fields">
                  <div>
                    <dt>Trạng thái hiện tại</dt>
                    <dd>{label(Boolean(query.data))}</dd>
                  </div>
                  <div>
                    <dt>Sau khi xác nhận</dt>
                    <dd>{label(Boolean(intent))}</dd>
                  </div>
                </dl>
              </>
            }
            confirmLabel="Xác nhận thay đổi"
            cancelLabel="Hủy"
            loading={saving}
            onConfirm={() => void save()}
            onClose={() => setIntent(null)}
            fallbackFocusRef={heading}
          />
        </>
      )}
    </section>
  );
}
