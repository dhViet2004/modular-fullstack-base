"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RoleBadge } from "@/components/ui/role-badge";
import { InlineAlert, Skeleton } from "@/components/ui/feedback";
import {
  changePassword,
  getCurrentUser,
  getSessions,
  revokeSession,
  type AuthSession,
  type AuthenticatedUser,
} from "../api/auth.api";
import { getAccountTab } from "../post-login-route";
import { getNavigationItems } from "../permissions";
import { useLogout } from "../hooks/use-logout";
import { useAuth } from "./auth-provider";
import { EmailVerificationNotice } from "./email-verification-notice";

function date(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

const accountTabs = [
  { value: "info", label: "Thông tin cá nhân", href: "/account" },
  { value: "roles", label: "Vai trò và quyền", href: "/account?tab=roles" },
  {
    value: "security",
    label: "Bảo mật & mật khẩu",
    href: "/account?tab=security",
  },
  {
    value: "sessions",
    label: "Phiên đăng nhập",
    href: "/account?tab=sessions",
  },
] as const;

export function AccountPanel() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const value = useSearchParams().get("tab");
  const tab = getAccountTab(value);
  useEffect(() => {
    if (value === "info") router.replace("/account", { scroll: false });
  }, [router, value]);
  if (isLoading)
    return (
      <div role="status">
        <p>Đang khôi phục phiên...</p>
        <Skeleton />
      </div>
    );
  if (!user)
    return (
      <p role="alert">
        Bạn chưa đăng nhập. <Link href="/login">Đăng nhập</Link>
      </p>
    );
  return <AccountContent key={user.id} user={user} tab={tab} />;
}

function AccountContent({
  user,
  tab,
}: {
  user: AuthenticatedUser;
  tab: ReturnType<typeof getAccountTab>;
}) {
  return (
    <section className="member-view" aria-labelledby="account-title">
      <header className="member-heading">
        <h1 id="account-title">Tài khoản của tôi</h1>
        <p>Hồ sơ, quyền truy cập và bảo mật của bạn.</p>
      </header>
      <div
        className="member-tabs"
        role="tablist"
        aria-label="Quản lý tài khoản cá nhân"
        onKeyDown={(event) => {
          const tabs = Array.from(
            event.currentTarget.querySelectorAll<HTMLAnchorElement>(
              '[role="tab"]',
            ),
          );
          const index = tabs.indexOf(
            document.activeElement as HTMLAnchorElement,
          );
          const target = {
            ArrowRight: (index + 1) % tabs.length,
            ArrowLeft: (index + tabs.length - 1) % tabs.length,
            Home: 0,
            End: tabs.length - 1,
          }[event.key];
          if (target === undefined) return;
          event.preventDefault();
          tabs[target]?.focus();
        }}
      >
        {accountTabs.map((item) => (
          <Link
            key={item.value}
            id={`account-tab-${item.value}`}
            role="tab"
            href={item.href}
            scroll={false}
            aria-selected={tab === item.value}
            aria-controls="account-tab-panel"
            tabIndex={tab === item.value ? 0 : -1}
            onKeyDown={(event) => {
              if (event.key !== " ") return;
              event.preventDefault();
              event.currentTarget.click();
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div
        className="member-view"
        id="account-tab-panel"
        role="tabpanel"
        aria-labelledby={`account-tab-${tab}`}
        tabIndex={0}
      >
        {tab === "info" && <AccountInfo user={user} />}
        {tab === "roles" && <AccountRoles user={user} />}
        {tab === "security" && <AccountSecurity user={user} />}
        {tab === "sessions" && <AccountSessions user={user} />}
      </div>
    </section>
  );
}

function AccountInfo({ user }: { user: AuthenticatedUser }) {
  const shortcuts = getNavigationItems(user.roles, user.permissions).filter(
    (item) => !item.href.startsWith("/account"),
  );
  return (
    <>
      <Card>
        <div className="member-profile">
          <span className="shell-avatar member-avatar" aria-hidden="true">
            {(user.displayName || user.email)
              .slice(0, 2)
              .toLocaleUpperCase("vi-VN")}
          </span>
          <div>
            <h2>{user.displayName ?? "Tài khoản"}</h2>
            <p className="member-muted">{user.email}</p>
          </div>
        </div>
        <div className="member-badges">
          <span
            className={
              "member-badge " +
              (user.status === "ACTIVE" ? "member-success" : "member-warning")
            }
          >
            {user.status === "ACTIVE" ? "Đang hoạt động" : "Tạm khóa"} ·{" "}
            {user.status}
          </span>
        </div>
        <dl className="member-fields">
          <div>
            <dt>Ngày tham gia</dt>
            <dd>{date(user.createdAt)}</dd>
          </div>
          <div>
            <dt>Xác minh email</dt>
            <dd>
              {user.emailVerifiedAt
                ? "Đã xác minh · " + date(user.emailVerifiedAt)
                : "Chưa xác minh"}
            </dd>
          </div>
        </dl>
        <EmailVerificationNotice className="member-email-notice" />
      </Card>
      <Card>
        <h2>Truy cập nhanh</h2>
        <div className="member-actions">
          <Link className="ui-button" href="/account/files">
            Tệp của tôi
          </Link>
          {shortcuts.map((item) => (
            <Link
              key={item.href}
              className="ui-button"
              data-variant="secondary"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </Card>
    </>
  );
}

function AccountRoles({ user }: { user: AuthenticatedUser }) {
  return (
    <Card>
      <h2>Vai trò và quyền</h2>
      <div className="member-badges">
        {user.roles.length
          ? user.roles.map((role) =>
              role === "MEMBER" ||
              role === "ADMIN" ||
              role === "SUPER_ADMIN" ? (
                <RoleBadge key={role} role={role} />
              ) : (
                <span key={role}>{role}</span>
              ),
            )
          : "Chưa được gán vai trò"}
      </div>
      <details open>
        <summary>Xem quyền của tôi</summary>
        {user.permissions.length ? (
          <ul className="member-permissions">
            {user.permissions.map((permission) => (
              <li key={permission}>
                <span className="member-badge">{permission}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="member-muted">Chưa có quyền được cấp.</p>
        )}
      </details>
    </Card>
  );
}

const passwordSchema = z.object({
  newPassword: z
    .string()
    .min(12, "Mật khẩu cần ít nhất 12 ký tự.")
    .max(128, "Mật khẩu không vượt quá 128 ký tự."),
  currentPassword: z.string().optional(),
});

function AccountSecurity({ user }: { user: AuthenticatedUser }) {
  const { updatePasswordStatus } = useAuth();
  const active = useRef(false);
  const busy = useRef(false);
  const [succeeded, setSucceeded] = useState(false);
  const [metadataError, setMetadataError] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: "", currentPassword: "" },
  });
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof passwordSchema>) =>
      changePassword(
        values.newPassword,
        user.hasPassword ? values.currentPassword : undefined,
      ),
    onSuccess: async () => {
      if (!active.current) return;
      reset();
      setSucceeded(true);
      updatePasswordStatus({ id: user.id, hasPassword: true });
      try {
        const updated = await getCurrentUser();
        if (active.current) updatePasswordStatus(updated);
      } catch {
        if (active.current) setMetadataError(true);
      }
    },
    onSettled: () => {
      busy.current = false;
    },
  });
  return (
    <section className="member-view" aria-labelledby="security-title">
      <header className="member-heading">
        <h2 id="security-title">Bảo mật tài khoản</h2>
        <p>Mật khẩu và xác thực của bạn.</p>
      </header>
      <Card>
        <h2>{user.hasPassword ? "Đổi mật khẩu" : "Đặt mật khẩu"}</h2>
        <form
          className="member-form"
          onSubmit={handleSubmit((values) => {
            if (busy.current) return;
            busy.current = true;
            setSucceeded(false);
            setMetadataError(false);
            mutation.mutate(values);
          })}
        >
          {user.hasPassword && (
            <Input
              label="Mật khẩu hiện tại"
              type="password"
              autoComplete="current-password"
              required
              disabled={mutation.isPending}
              {...register("currentPassword")}
            />
          )}
          <Input
            label="Mật khẩu mới"
            type="password"
            autoComplete="new-password"
            hint="12–128 ký tự."
            error={errors.newPassword?.message}
            required
            disabled={mutation.isPending}
            {...register("newPassword")}
          />
          <Button
            type="submit"
            className="member-fit"
            loading={mutation.isPending}
          >
            {user.hasPassword ? "Cập nhật mật khẩu" : "Đặt mật khẩu"}
          </Button>
          {succeeded && (
            <InlineAlert variant="success">
              Đã cập nhật mật khẩu. Bạn có thể đăng nhập bằng email và mật khẩu.
            </InlineAlert>
          )}
          {metadataError && (
            <p role="status">
              Mật khẩu đã cập nhật; chưa tải lại được thông tin tài khoản.
            </p>
          )}
          {mutation.isError && (
            <InlineAlert>
              Không thể cập nhật mật khẩu. Kiểm tra mật khẩu hiện tại và thử
              lại.
            </InlineAlert>
          )}
        </form>
      </Card>
    </section>
  );
}

function AccountSessions({ user }: { user: AuthenticatedUser }) {
  const queryClient = useQueryClient();
  const queryKey = ["auth", "sessions", user.id];
  const active = useRef(false);
  const busy = useRef(false);
  const [selected, setSelected] = useState<AuthSession | null>(null);
  const [message, setMessage] = useState("");
  const logout = useLogout();
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => getSessions(signal),
    retry: false,
  });
  const revoke = useMutation({
    mutationFn: revokeSession,
    onSuccess: (_result, id) => {
      if (!active.current) return;
      queryClient.setQueryData<AuthSession[]>(queryKey, (items) =>
        items?.filter((item) => item.id !== id),
      );
      setSelected(null);
      setMessage("Đã thu hồi phiên đăng nhập.");
      void queryClient.invalidateQueries({ queryKey });
    },
    onSettled: () => {
      busy.current = false;
    },
  });
  const pending = revoke.isPending || logout.isPending;
  const sessions = query.data ?? [];
  const forbidden =
    axios.isAxiosError(query.error) && query.error.response?.status === 403;
  const action = (session: AuthSession) => (
    <Button
      variant="secondary"
      data-revoke={session.id}
      disabled={pending}
      onClick={() => {
        setSelected(session);
        revoke.reset();
        setMessage("");
      }}
    >
      Đăng xuất phiên này
    </Button>
  );
  return (
    <section className="member-view" aria-labelledby="sessions-title">
      <header className="member-heading">
        <h2 id="sessions-title">Phiên đăng nhập</h2>
        <p>Quản lý từng phiên truy cập tài khoản của bạn.</p>
      </header>
      <div className="ui-alert member-information" role="note">
        Chỉ các phiên của bạn
        <br />
        Danh sách không suy ra tên thiết bị, trình duyệt, địa chỉ IP hoặc vị trí
        từ mã phiên.
      </div>
      {message && <InlineAlert variant="success">{message}</InlineAlert>}
      {query.isPending ? (
        <Card aria-busy="true">
          <p role="status">Đang tải phiên đăng nhập...</p>
          <Skeleton />
          <Skeleton />
        </Card>
      ) : null}
      {query.isError && (
        <Card className={query.data ? "" : "member-empty"}>
          <InlineAlert>
            {forbidden
              ? "Bạn không có quyền xem các phiên này."
              : "Không tải được phiên đăng nhập. Dữ liệu chưa được cập nhật."}
          </InlineAlert>
          <Button
            className="member-fit"
            loading={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Thử lại
          </Button>
        </Card>
      )}
      {query.data && (
        <Card>
          <h2>Phiên đăng nhập đang hoạt động</h2>
          <p className="member-muted">{sessions.length} phiên</p>
          {query.isFetching && <p role="status">Đang cập nhật danh sách...</p>}
          {!sessions.length ? (
            <p>Không có phiên đăng nhập đang hoạt động.</p>
          ) : (
            <>
              <table className="member-table" aria-label="Phiên đăng nhập">
                <thead>
                  <tr>
                    <th scope="col">Phiên</th>
                    <th scope="col">Tạo lúc</th>
                    <th scope="col">Hết hạn</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id}>
                      <td>{session.id}</td>
                      <td>{date(session.createdAt)}</td>
                      <td>{date(session.expiresAt)}</td>
                      <td>
                        {session.current ? "Thiết bị này" : "Đang hoạt động"}
                      </td>
                      <td>{action(session)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="member-mobile-list">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <Card>
                      <p>
                        Phiên
                        <br />
                        {session.id}
                      </p>
                      <span className="member-badge member-current member-fit">
                        {session.current ? "Thiết bị này" : "Đang hoạt động"}
                      </span>
                      <dl className="member-fields">
                        <div>
                          <dt>Tạo lúc</dt>
                          <dd>{date(session.createdAt)}</dd>
                        </div>
                        <div>
                          <dt>Hết hạn</dt>
                          <dd>{date(session.expiresAt)}</dd>
                        </div>
                      </dl>
                      {action(session)}
                    </Card>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="member-caption">
            Thu hồi phiên hiện tại sẽ đưa bạn về trang đăng nhập. Phiên khác
            ngừng được cấp token mới; quyền truy cập đã cấp có thể còn hiệu lực
            đến khi hết hạn.
          </p>
        </Card>
      )}
      <ConfirmDialog
        open={selected !== null}
        title="Đăng xuất phiên đăng nhập này?"
        description={
          <div className="member-fields">
            <p>
              {selected?.current
                ? "Đây là phiên hiện tại. Bạn sẽ được đưa về trang đăng nhập."
                : "Phiên này sẽ không thể khôi phục đăng nhập. Quyền truy cập đã cấp có thể còn hiệu lực đến khi hết hạn."}
            </p>
            <p>
              Mã phiên
              <br />
              {selected?.id}
            </p>
            {revoke.isError && (
              <InlineAlert>
                Không thể thu hồi phiên. Vui lòng thử lại.
              </InlineAlert>
            )}
          </div>
        }
        confirmLabel="Đăng xuất phiên này"
        cancelLabel={pending ? "Đang xử lý..." : "Hủy"}
        confirmVariant="danger"
        loading={pending}
        onClose={() => {
          if (!busy.current) setSelected(null);
        }}
        onConfirm={() => {
          if (!selected || busy.current) return;
          busy.current = true;
          if (selected.current)
            logout.mutate(undefined, {
              onSettled: () => {
                busy.current = false;
              },
            });
          else revoke.mutate(selected.id);
        }}
      />
    </section>
  );
}
