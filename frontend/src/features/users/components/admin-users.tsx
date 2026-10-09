"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InlineAlert, Skeleton } from "@/components/ui/feedback";
import { RoleBadge } from "@/components/ui/role-badge";
import { DetailsDrawer } from "@/components/ui/details-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/features/auth/components/auth-provider";
import { PERMISSIONS } from "@/features/auth/permissions";
import type { AuthenticatedUser } from "@/features/auth/api/auth.api";
import { getAuthRequestVersion } from "@/lib/auth/access-token";
import { useUsers } from "../hooks/use-users";
import { setAdminRole, type AdminUser } from "../api/users.api";

export function AdminUsers() {
  const { user, isLoading, status } = useAuth();
  if (isLoading) return <p role="status">Đang khôi phục phiên...</p>;
  if (!user)
    return (
      <p role="alert">
        401 · Bạn chưa đăng nhập. <Link href="/login">Đăng nhập</Link>
      </p>
    );
  if (!user.permissions.includes(PERMISSIONS.USERS_READ))
    return <UsersForbidden />;
  return (
    <UsersContent
      key={user.id}
      user={user}
      active={status === "authenticated"}
      verifying={status === "loading"}
    />
  );
}

function UsersForbidden() {
  return (
    <section className="admin-view">
      <header className="admin-heading">
        <h1>Người dùng</h1>
      </header>
      <Card className="admin-empty" role="alert">
        <span className="admin-muted">403 · FORBIDDEN</span>
        <h2>Bạn không có quyền truy cập</h2>
        <p>Quyền truy cập danh sách người dùng không còn khả dụng.</p>
        <Link className="ui-button admin-link-button" href="/account">
          Về trang của tôi
        </Link>
      </Card>
    </section>
  );
}

function UserRoles({ roles }: { roles: string[] }) {
  return (
    <div className="admin-badges">
      {roles.length
        ? roles.map((role) =>
            role === "MEMBER" || role === "ADMIN" || role === "SUPER_ADMIN" ? (
              <RoleBadge key={role} role={role} />
            ) : (
              <span key={role}>{role}</span>
            ),
          )
        : "Chưa có vai trò"}
    </div>
  );
}

function UserStatus({ user }: { user: AdminUser }) {
  return (
    <div>
      <span className={user.status === "SUSPENDED" ? "admin-danger" : ""}>
        {user.status === "ACTIVE" ? "Đang hoạt động" : "Tạm khóa"} (
        {user.status})
      </span>
      <br />
      <span className={!user.emailVerifiedAt ? "admin-muted" : ""}>
        {user.emailVerifiedAt ? "Đã xác minh" : "Chưa xác minh"}
      </span>
    </div>
  );
}

function UsersContent({
  user,
  active,
  verifying,
}: {
  user: AuthenticatedUser;
  active: boolean;
  verifying: boolean;
}) {
  const [blocked, setBlocked] = useState(false);
  const usersQuery = useUsers(user.id, active && !blocked);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [ascending, setAscending] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [roleTarget, setRoleTarget] = useState<{
    user: AdminUser;
    enabled: boolean;
  } | null>(null);
  const [updatedId, setUpdatedId] = useState<string | null>(null);
  const [roleForbidden, setRoleForbidden] = useState(false);
  const { retrySession } = useAuth();
  const [feedback, setFeedback] = useState<{
    error: boolean;
    text: string;
  } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const alive = useRef(false);
  const submitting = useRef(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      request.current?.abort();
    };
  }, []);
  const hasRolePermission =
    user.roles.includes("SUPER_ADMIN") &&
    user.permissions.includes(PERMISSIONS.ROLES_MANAGE);
  const canManageRoles = hasRolePermission && !blocked && !roleForbidden;
  useEffect(() => {
    setBlocked(false);
    setRoleForbidden(false);
  }, [user]);
  useEffect(() => {
    const invalidate = () => {
      request.current?.abort();
      setBlocked(true);
      setRoleTarget(null);
      setSelectedId(null);
      setFeedback(null);
      setUpdatedId(null);
    };
    window.addEventListener("auth:requests-invalidated", invalidate);
    return () =>
      window.removeEventListener("auth:requests-invalidated", invalidate);
  }, []);
  useEffect(() => {
    if (
      !active ||
      !hasRolePermission ||
      (usersQuery.error &&
        axios.isAxiosError(usersQuery.error) &&
        usersQuery.error.response?.status === 403)
    ) {
      request.current?.abort();
      setRoleTarget(null);
      setUpdatedId(null);
      setFeedback(null);
    }
  }, [active, hasRolePermission, usersQuery.error]);
  const roleMutation = useMutation({
    mutationFn: ({
      id,
      enabled,
      signal,
    }: {
      id: string;
      enabled: boolean;
      signal: AbortSignal;
    }) => setAdminRole(id, enabled, signal),
    retry: false,
  });

  async function changeRole() {
    if (submitting.current || !canManageRoles || !active || !roleTarget) return;
    const listedUser = usersQuery.data?.find(
      (item) => item.id === roleTarget.user.id,
    );
    if (
      !listedUser ||
      listedUser.roles.includes("ADMIN") === roleTarget.enabled
    ) {
      setRoleTarget(null);
      return;
    }
    submitting.current = true;
    const version = getAuthRequestVersion();
    const controller = new AbortController();
    request.current = controller;
    setFeedback(null);
    setUpdatedId(null);
    try {
      await roleMutation.mutateAsync({
        id: listedUser.id,
        enabled: roleTarget.enabled,
        signal: controller.signal,
      });
      if (
        !alive.current ||
        controller.signal.aborted ||
        version !== getAuthRequestVersion()
      )
        return;
      setRoleTarget(null);
      setFeedback({ error: false, text: "Đã cập nhật vai trò ADMIN." });
      const refreshed = await usersQuery.refetch({ throwOnError: false });
      if (
        !alive.current ||
        controller.signal.aborted ||
        version !== getAuthRequestVersion()
      )
        return;
      if (!refreshed.isError) setUpdatedId(listedUser.id);
      if (listedUser.id === user.id) retrySession();
    } catch (error) {
      if (
        alive.current &&
        !controller.signal.aborted &&
        version === getAuthRequestVersion() &&
        !axios.isCancel(error)
      ) {
        const forbidden =
          axios.isAxiosError(error) && error.response?.status === 403;
        setRoleTarget(null);
        if (forbidden) setRoleForbidden(true);
        setFeedback({
          error: true,
          text: forbidden
            ? "Bạn không được phép thay đổi vai trò."
            : "Không thể cập nhật vai trò. Vui lòng thử lại.",
        });
      }
    } finally {
      submitting.current = false;
      if (request.current === controller) request.current = null;
    }
  }

  function resetFilters() {
    setSearch("");
    setRole("");
    setStatus("");
    setAscending(true);
    searchInput.current?.focus();
  }

  const data = usersQuery.data ?? [];
  const term = search.trim().toLocaleLowerCase("vi-VN");
  const visible = data
    .filter(
      (item) =>
        (!term ||
          (item.displayName ?? "").toLocaleLowerCase("vi-VN").includes(term) ||
          item.email.toLocaleLowerCase("vi-VN").includes(term)) &&
        (!role || item.roles.includes(role)) &&
        (!status || item.status === status),
    )
    .sort(
      (a, b) =>
        (ascending ? 1 : -1) *
        (a.displayName ?? a.email).localeCompare(
          b.displayName ?? b.email,
          "vi-VN",
          { sensitivity: "base" },
        ),
    );
  const selected = visible.find((item) => item.id === selectedId);
  const updated = data.find((item) => item.id === updatedId);
  const forbidden =
    axios.isAxiosError(usersQuery.error) &&
    usersQuery.error.response?.status === 403;
  if (forbidden) return <UsersForbidden />;

  const date = (value: string) => new Date(value).toLocaleString("vi-VN");
  const roleAction = (item: AdminUser) =>
    canManageRoles ? (
      <Button
        variant="secondary"
        disabled={!active || roleMutation.isPending || usersQuery.isFetching}
        onClick={() =>
          setRoleTarget({ user: item, enabled: !item.roles.includes("ADMIN") })
        }
      >
        {item.roles.includes("ADMIN") ? "Thu hồi ADMIN" : "Cấp ADMIN"}
      </Button>
    ) : null;
  return (
    <section className="admin-view" aria-labelledby="users-title">
      <header className="admin-heading">
        <h1 id="users-title" tabIndex={-1} ref={heading}>
          Người dùng
        </h1>
        <p>Tra cứu thông tin; khu vực ADMIN chỉ có quyền xem.</p>
      </header>
      {blocked || verifying || usersQuery.isPending ? (
        <Card role="status" aria-label="Đang tải người dùng">
          <Skeleton />
          <Skeleton />
          <Skeleton />
          <p className="admin-muted">Đang tải dữ liệu...</p>
        </Card>
      ) : (
        <>
          {usersQuery.isError ? (
            <InlineAlert>
              Không thể tải danh sách người dùng.
              <Button
                variant="secondary"
                loading={usersQuery.isFetching}
                onClick={() => void usersQuery.refetch()}
              >
                Thử lại
              </Button>
            </InlineAlert>
          ) : null}
          {roleForbidden ? (
            <Card className="admin-empty" role="alert">
              <span className="admin-muted">403 · FORBIDDEN</span>
              <h2>Bạn không có quyền thực hiện thao tác này</h2>
              <p>
                Thao tác cần SUPER_ADMIN và roles:manage. Hãy kiểm tra lại quyền
                hiện tại.
              </p>
              <Button variant="secondary" onClick={retrySession}>
                Kiểm tra lại quyền
              </Button>
            </Card>
          ) : null}
          {feedback && hasRolePermission && !blocked && !roleForbidden ? (
            <InlineAlert variant={feedback.error ? "error" : "success"}>
              {feedback.text}
            </InlineAlert>
          ) : null}
          {updated && hasRolePermission && !blocked ? (
            <Card className="admin-updated-user">
              <h2>Người dùng sau cập nhật</h2>
              <p>
                {updated.displayName ?? "Chưa đặt tên"}
                <br />
                {updated.email}
              </p>
              <UserRoles roles={updated.roles} />
            </Card>
          ) : null}
          {usersQuery.data ? (
            <Card>
              <h2>Danh sách người dùng</h2>
              <p className="admin-muted">
                Tìm kiếm, lọc và sắp xếp trong danh sách đã tải.
              </p>
              <div className="admin-filters">
                <Input
                  id="users-search"
                  type="search"
                  label="Tìm tên hoặc email"
                  placeholder="Tìm trong danh sách"
                  value={search}
                  ref={searchInput}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <Input
                  id="users-role"
                  type="select"
                  label="Vai trò"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                >
                  <option value="">Tất cả vai trò</option>
                  <option value="MEMBER">Thành viên</option>
                  <option value="ADMIN">Quản trị viên</option>
                  <option value="SUPER_ADMIN">Siêu quản trị viên</option>
                </Input>
                <Input
                  id="users-status"
                  type="select"
                  label="Trạng thái"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="SUSPENDED">Tạm khóa</option>
                </Input>
              </div>
              {data.length === 0 ? (
                <div className="admin-empty">
                  <h2>Chưa có người dùng</h2>
                  <p>Danh sách hiện chưa có tài khoản.</p>
                  <Button
                    variant="secondary"
                    loading={usersQuery.isFetching}
                    onClick={() => void usersQuery.refetch()}
                  >
                    Tải lại danh sách
                  </Button>
                </div>
              ) : visible.length === 0 ? (
                <div className="admin-empty" role="status">
                  <h2>Không tìm thấy người dùng</h2>
                  <p>Thay đổi tìm kiếm hoặc bộ lọc.</p>
                  <Button onClick={resetFilters}>Xóa bộ lọc</Button>
                </div>
              ) : (
                <>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th
                            aria-sort={ascending ? "ascending" : "descending"}
                          >
                            <Button
                              variant="ghost"
                              onClick={() => setAscending(!ascending)}
                            >
                              Họ tên / Email {ascending ? "↑" : "↓"}
                            </Button>
                          </th>
                          <th>Vai trò</th>
                          <th>Trạng thái / Xác minh</th>
                          <th>Ngày tạo</th>
                          {canManageRoles && <th>Quản lý</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((item) => (
                          <tr key={item.id} data-user-id={item.id}>
                            <td>
                              <Button
                                variant="ghost"
                                className="admin-user-name"
                                onClick={() => setSelectedId(item.id)}
                                aria-label={
                                  "Xem chi tiết " +
                                  (item.displayName ?? item.email)
                                }
                              >
                                <strong>
                                  {item.displayName ?? "Chưa đặt tên"}
                                </strong>
                                <span>{item.email}</span>
                              </Button>
                            </td>
                            <td>
                              <UserRoles roles={item.roles} />
                            </td>
                            <td>
                              <UserStatus user={item} />
                            </td>
                            <td className="admin-muted">
                              {date(item.createdAt)}
                            </td>
                            {canManageRoles && <td>{roleAction(item)}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="admin-mobile-list">
                    <Button
                      variant="secondary"
                      onClick={() => setAscending(!ascending)}
                    >
                      Tên {ascending ? "A → Z" : "Z → A"}
                    </Button>
                    {visible.map((item) => (
                      <div
                        className="admin-mobile-card"
                        key={item.id}
                        data-user-id={item.id}
                      >
                        <strong>{item.displayName ?? "Chưa đặt tên"}</strong>
                        <p>{item.email}</p>
                        <UserRoles roles={item.roles} />
                        <UserStatus user={item} />
                        <p className="admin-muted">
                          Ngày tạo: {date(item.createdAt)}
                        </p>
                        <Button
                          variant="secondary"
                          onClick={() => setSelectedId(item.id)}
                        >
                          Xem chi tiết
                        </Button>
                        {roleAction(item)}
                      </div>
                    ))}
                  </div>
                </>
              )}
              <p className="admin-muted" role="status">
                {visible.length} / {data.length} tài khoản
              </p>
            </Card>
          ) : null}
          {selected ? (
            <DetailsDrawer
              title="Thông tin người dùng"
              onClose={() => setSelectedId(null)}
              fallbackFocusRef={heading}
            >
              <dl className="admin-detail-fields">
                <div>
                  <dt>Họ tên / Email</dt>
                  <dd>
                    {selected.displayName ?? "Chưa đặt tên"}
                    <br />
                    {selected.email}
                  </dd>
                </div>
                <div>
                  <dt>ID</dt>
                  <dd>{selected.id}</dd>
                </div>
                <div>
                  <dt>Vai trò</dt>
                  <dd>
                    <UserRoles roles={selected.roles} />
                  </dd>
                </div>
                <div>
                  <dt>Trạng thái / Xác minh</dt>
                  <dd>
                    <UserStatus user={selected} />
                  </dd>
                </div>
                <div>
                  <dt>Ngày tạo</dt>
                  <dd>{date(selected.createdAt)}</dd>
                </div>
              </dl>
              <div className="admin-notice">
                Thông tin chỉ đọc. Các thay đổi vai trò không thực hiện trong
                drawer này.
              </div>
            </DetailsDrawer>
          ) : null}
          {canManageRoles ? (
            <ConfirmDialog
              open={Boolean(roleTarget) && active}
              title={
                roleTarget?.enabled
                  ? "Cấp quyền ADMIN?"
                  : "Thu hồi quyền ADMIN?"
              }
              description={
                <>
                  <p>
                    {roleTarget?.user.displayName ?? roleTarget?.user.email}
                    <br />
                    {roleTarget?.user.email}
                  </p>
                  <div className="admin-notice">
                    Chỉ thay đổi vai trò ADMIN. Không cấp SUPER_ADMIN hoặc chỉnh
                    sửa danh mục quyền.
                  </div>
                  <p>
                    Máy chủ xác nhận quyền và thay đổi. Đóng hộp thoại không thu
                    hồi thao tác đã gửi.
                  </p>
                </>
              }
              confirmLabel={
                roleTarget?.enabled ? "Cấp quyền ADMIN" : "Thu hồi ADMIN"
              }
              cancelLabel="Hủy"
              confirmVariant={roleTarget?.enabled ? "primary" : "danger"}
              loading={roleMutation.isPending}
              onConfirm={() => void changeRole()}
              onClose={() => setRoleTarget(null)}
              fallbackFocusRef={heading}
            />
          ) : null}
        </>
      )}
    </section>
  );
}
