"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FiArrowLeft,
  FiShield,
  FiKey,
  FiPlus,
  FiTrash2,
  FiCheckCircle
} from "react-icons/fi";
import { userKeys } from "@/lib/query/query-keys";
import { usersApi } from "../api/users.api";
import {
  useUserDetail,
  useUserPermissions,
  useAvailableRoles,
  useResetUserPassword,
  useOverridePermission,
  useRemovePermissionOverride
} from "../hooks/use-users";
import { authClient } from "@/lib/auth/auth-client";
import { usePermissions } from "@/lib/auth/use-permission";

export function UserDetail({ id }: { id: string }) {
  const qc = useQueryClient();
  const userQuery = useUserDetail(id);
  const permissionsQuery = useUserPermissions(id);
  const availableRolesQuery = useAvailableRoles();
  const resetPass = useResetUserPassword();
  const overrideMut = useOverridePermission(id);
  const removeOverrideMut = useRemovePermissionOverride(id);

  const [name, setName] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [overridePermissionId, setOverridePermissionId] = useState("");
  const [overrideEffect, setOverrideEffect] = useState<"ALLOW" | "DENY">("ALLOW");
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const currentUser = authClient.getUser();
  const { hasPermission } = usePermissions(currentUser);
  const canUpdateUser = hasPermission("users.update");
  const canAssignRoles = hasPermission("users.roles.assign");

  const currentMaxRank = useMemo(() => {
    if (!currentUser?.roles || currentUser.roles.length === 0) return 0;
    return Math.max(...currentUser.roles.map((r) => r.rank), 0);
  }, [currentUser]);

  useEffect(() => {
    if (userQuery.data) {
      setName(userQuery.data.displayName ?? "");
    }
  }, [userQuery.data]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: userKeys.all });
  };

  const update = useMutation({
    mutationFn: () => usersApi.update(id, name),
    onSuccess: refresh
  });

  const assign = useMutation({
    mutationFn: () => usersApi.assign(id, selectedRoleId),
    onSuccess: () => {
      setSelectedRoleId("");
      refresh();
    }
  });

  const removeRole = useMutation({
    mutationFn: (roleId: string) => usersApi.remove(id, roleId),
    onSuccess: refresh
  });

  if (userQuery.isLoading) {
    return <div className="loading">Đang tải thông tin người dùng…</div>;
  }

  if (!userQuery.data) {
    return <div className="error">Không thể tải thông tin người dùng.</div>;
  }

  const u = userQuery.data;
  const targetMaxRank = u.roles.length > 0 ? Math.max(...u.roles.map((r) => r.role.rank)) : 0;
  const isSelf = u.id === currentUser?.id;
  // Không được thao tác nếu người ngang hoặc cao hơn rank
  const cannotAct = isSelf || currentMaxRank <= targetMaxRank;

  const handleResetPassword = async () => {
    if (!confirm(`Bạn có chắc chắn muốn cấp mật khẩu tạm thời 24h cho ${u.email}?`)) {
      return;
    }
    try {
      const res = await resetPass.mutateAsync(id);
      setResetMessage(
        `Đã tạo mật khẩu tạm (hiệu lực 24 giờ) gửi tới email của người dùng. Hết hạn: ${new Date(
          res.temporaryExpiresAt
        ).toLocaleString("vi-VN")}`
      );
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } } };
      alert(errObj?.response?.data?.error?.message || "Không thể cấp mật khẩu tạm thời.");
    }
  };

  const handleAddOverride = async () => {
    if (!overridePermissionId) return;
    try {
      await overrideMut.mutateAsync({
        permissionId: overridePermissionId,
        effect: overrideEffect
      });
      setOverridePermissionId("");
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } } };
      alert(errObj?.response?.data?.error?.message || "Không thể áp dụng ghi đè quyền.");
    }
  };

  return (
    <>
      <Link className="back" href="/users" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        <FiArrowLeft size={16} /> Quay lại danh sách người dùng
      </Link>

      {resetMessage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            padding: "0.85rem 1.25rem",
            borderRadius: "10px",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#10b981",
            fontSize: "0.9rem",
            margin: "1rem 0"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FiCheckCircle size={18} />
            <span>{resetMessage}</span>
          </div>
          <button
            onClick={() => setResetMessage(null)}
            style={{ background: "none", border: "none", color: "#10b981", cursor: "pointer", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="detail-grid">
        {/* Cột 1: Thông tin cơ bản & Quản lý mật khẩu */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <section className="panel">
            <div className="profile-head">
              <div className="avatar">{(u.displayName ?? u.email).slice(0, 2).toUpperCase()}</div>
              <div>
                <h2>{u.displayName ?? "Người dùng chưa đặt tên"}</h2>
                <p>{u.email}</p>
              </div>
              <span style={{ marginLeft: "auto" }} className={`badge ${u.status === "BLOCKED" ? "danger" : "success"}`}>
                <i className="dot" />
                {u.status === "BLOCKED" ? "Bị khóa" : "Hoạt động"}
              </span>
            </div>

            <div className="form-panel" style={{ marginTop: "1rem" }}>
              <label className="field">
                <span>Tên hiển thị</span>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              {update.isSuccess && <p className="success">Đã cập nhật thông tin thành công.</p>}
              <button
                className="btn"
                disabled={!name || update.isPending || (cannotAct && !isSelf) || !canUpdateUser}
                onClick={() => update.mutate()}
              >
                {update.isPending ? "Đang lưu…" : "Lưu tên hiển thị"}
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Quản lý mật khẩu</h2>
                <p>Cấp lại mật khẩu tạm thời 24 giờ cho người dùng.</p>
              </div>
            </div>
            <div className="form-panel">
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted, #8b9bb4)", lineHeight: 1.5, margin: 0 }}>
                Quản trị viên có thể cấp mật khẩu tạm thời có hiệu lực trong vòng <strong>24 giờ</strong>. Mật khẩu sẽ
                được gửi trực tiếp về email của người dùng và họ sẽ được yêu cầu đổi mật khẩu mới khi đăng nhập.
              </p>
              <button
                className="btn secondary"
                disabled={cannotAct || resetPass.isPending || !canUpdateUser}
                onClick={handleResetPassword}
                title={
                  !canUpdateUser
                    ? "Bạn không có quyền cập nhật người dùng"
                    : cannotAct
                    ? "Không thể đổi mật khẩu của tài khoản cùng hoặc cao hơn cấp bậc"
                    : "Tạo mật khẩu tạm 24h và gửi mail"
                }
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
              >
                <FiKey size={15} />
                {resetPass.isPending ? "Đang xử lý cấp mật khẩu..." : "Cấp mật khẩu tạm thời (24h)"}
              </button>
            </div>
          </section>
        </div>

        {/* Cột 2: Vai trò & Cấp bậc Level/Rank Hierarchy */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Vai trò & Cấp bậc (Level / Rank)</h2>
                <p>Hệ thống tự động kế thừa: Cấp bậc cao hơn sở hữu toàn bộ quyền của các cấp bậc bên dưới.</p>
              </div>
            </div>
            <div className="form-panel">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {u.roles.map((x) => (
                  <div className="session-card" key={x.role.id}>
                    <div className="device-icon" style={{ display: "grid", placeItems: "center" }}>
                      <FiShield size={18} />
                    </div>
                    <div className="session-info">
                      <strong>{x.role.name}</strong>
                      <p>Cấp bậc quyền hạn: Rank {x.role.rank}</p>
                    </div>
                    {canAssignRoles && (
                      <button
                        className="btn danger sm"
                        disabled={cannotAct || removeRole.isPending}
                        title={cannotAct ? "Không thể gỡ vai trò của tài khoản cùng hoặc cao hơn cấp bậc" : undefined}
                        onClick={() => removeRole.mutate(x.role.id)}
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        <FiTrash2 size={13} /> Gỡ bỏ
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {canAssignRoles && (
                <>
                  <div className="divider">Gán thêm vai trò</div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <select
                      className="input"
                      value={selectedRoleId}
                      onChange={(e) => setSelectedRoleId(e.target.value)}
                      disabled={cannotAct}
                    >
                      <option value="">-- Chọn vai trò cần gán --</option>
                      {availableRolesQuery.data?.roles
                        ?.filter((r) => r.name !== "SUPER_ADMIN" && r.rank < 100)
                        .map((r) => {
                          // Chặn gán role có rank > currentMaxRank
                          const disabledRole = r.rank > currentMaxRank;
                          return (
                            <option key={r.id} value={r.id} disabled={disabledRole}>
                              {r.name} (Rank {r.rank}){disabledRole ? " - Vượt cấp" : ""}
                            </option>
                          );
                        })}
                    </select>
                    <button
                      className="btn secondary"
                      disabled={!selectedRoleId || assign.isPending || cannotAct}
                      onClick={() => assign.mutate()}
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}
                    >
                      <FiPlus size={14} /> Gán vai trò
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Phân quyền động (Dynamic Permission Overrides) */}
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Phân quyền động (Dynamic Permissions)</h2>
                <p>Ghi đè trực tiếp quyền hạn cho người dùng này (ALLOW / DENY).</p>
              </div>
            </div>

            <div className="form-panel">
              {/* Form thêm override (chỉ hiển thị khi có quyền users.roles.assign) */}
              {canAssignRoles && (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <select
                    className="input"
                    style={{ flex: 1, minWidth: 200 }}
                    value={overridePermissionId}
                    onChange={(e) => setOverridePermissionId(e.target.value)}
                    disabled={cannotAct}
                  >
                    <option value="">-- Chọn quyền cần ghi đè --</option>
                    {permissionsQuery.data?.allPermissions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className="input"
                    style={{ width: 140 }}
                    value={overrideEffect}
                    onChange={(e) => setOverrideEffect(e.target.value as "ALLOW" | "DENY")}
                    disabled={cannotAct}
                  >
                    <option value="ALLOW">ALLOW (Cấp thêm)</option>
                    <option value="DENY">DENY (Tước bỏ)</option>
                  </select>

                  <button
                    className="btn secondary"
                    disabled={!overridePermissionId || overrideMut.isPending || cannotAct}
                    onClick={handleAddOverride}
                    style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <FiPlus size={14} /> Áp dụng
                  </button>
                </div>
              )}

              {/* Danh sách các override hiện tại */}
              <div style={{ marginTop: "1rem" }}>
                <strong style={{ fontSize: "0.85rem", color: "var(--text-muted, #8b9bb4)" }}>
                  Các quyền ghi đè riêng biệt (Overrides):
                </strong>
                {permissionsQuery.data?.overrides && permissionsQuery.data.overrides.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                    {permissionsQuery.data.overrides.map((ov) => (
                      <div
                        key={ov.permissionId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.5rem 0.75rem",
                          borderRadius: "8px",
                          background: "var(--soft, #f5f7fb)",
                          border: "1px solid var(--line, #e4e8f0)"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span
                            className="badge"
                            style={{
                              background:
                                ov.effect === "ALLOW" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                              color: ov.effect === "ALLOW" ? "#10b981" : "#ef4444",
                              borderColor:
                                ov.effect === "ALLOW" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"
                            }}
                          >
                            {ov.effect}
                          </span>
                          <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--ink, #17213b)" }}>{ov.permission.name}</span>
                        </div>
                        {canAssignRoles && (
                          <button
                            className="btn danger sm"
                            disabled={cannotAct || removeOverrideMut.isPending}
                            onClick={() => removeOverrideMut.mutate(ov.permissionId)}
                            style={{ padding: "4px 8px" }}
                            title="Xóa ghi đè"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted, #8b9bb4)", marginTop: "0.5rem" }}>
                    Chưa có quyền ghi đè nào. Quyền hạn đang tuân theo cấp bậc mặc định.
                  </p>
                )}
              </div>

              {/* Danh sách quyền hiệu lực (Effective Permissions) */}
              <div style={{ marginTop: "1.25rem" }}>
                <strong style={{ fontSize: "0.85rem", color: "var(--text-muted, #8b9bb4)" }}>
                  Tổng hợp quyền hạn hiệu lực (Sau kế thừa thứ bậc & ghi đè):
                </strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.5rem" }}>
                  {permissionsQuery.data?.effectivePermissions.map((perm) => (
                    <span
                      key={perm}
                      style={{
                        padding: "3px 8px",
                        fontSize: "0.78rem",
                        fontFamily: "monospace",
                        borderRadius: "6px",
                        background: "rgba(59, 130, 246, 0.12)",
                        color: "#93c5fd",
                        border: "1px solid rgba(59, 130, 246, 0.25)"
                      }}
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
