"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FiUsers,
  FiCheckCircle,
  FiSlash,
  FiShield,
  FiKey,
  FiSearch,
  FiLock,
  FiUnlock,
  FiAlertCircle,
  FiCheck
} from "react-icons/fi";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useUserAction, useUsers, useResetUserPassword } from "../hooks/use-users";
import { authClient } from "@/lib/auth/auth-client";
import { usePermissions } from "@/lib/auth/use-permission";
import type { User } from "../types/user";
import { AssignRoleModal } from "./assign-role-modal";

export function UserList() {
  const q = useUsers();
  const m = useUserAction();
  const resetPass = useResetUserPassword();
  const [search, setSearch] = useState("");
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);
  const [selectedUserForRoleAssign, setSelectedUserForRoleAssign] = useState<User | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const currentUser = authClient.getUser();
  const { hasPermission } = usePermissions(currentUser);
  const canAssignRoles = hasPermission("users.roles.assign");
  const canUpdateUser = hasPermission("users.update");
  const canBlockUser = hasPermission("users.block");

  const currentMaxRank = useMemo(() => {
    if (!currentUser?.roles || currentUser.roles.length === 0) return 0;
    return Math.max(...currentUser.roles.map((r) => r.rank), 0);
  }, [currentUser]);

  const users = useMemo(
    () =>
      q.data?.filter((u) =>
        (u.displayName ?? u.email).toLowerCase().includes(search.toLowerCase())
      ) ?? [],
    [q.data, search]
  );

  const activeCount = q.data?.filter((x) => x.status !== "BLOCKED").length ?? 0;
  const blockedCount = (q.data?.length ?? 0) - activeCount;

  const handleConfirmResetPassword = async () => {
    if (!selectedUserForReset) return;
    try {
      const res = await resetPass.mutateAsync(selectedUserForReset.id);
      setResetSuccessMessage(
        `Đã tạo mật khẩu tạm (hiệu lực 24h) và gửi tới email ${selectedUserForReset.email}. Hết hạn vào lúc: ${new Date(res.temporaryExpiresAt).toLocaleString("vi-VN")}`
      );
      setSelectedUserForReset(null);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } } };
      alert(errObj?.response?.data?.error?.message || "Không thể cấp lại mật khẩu cho tài khoản này");
    }
  };

  const getRankBadge = (u: User) => {
    const maxRank = u.roles.length > 0 ? Math.max(...u.roles.map((r) => r.role.rank)) : 0;
    if (maxRank >= 100) {
      return (
        <span className="badge" style={{ background: "rgba(139, 92, 246, 0.18)", color: "#a78bfa", borderColor: "rgba(139, 92, 246, 0.3)" }}>
          <FiShield size={12} style={{ marginRight: 4 }} /> Super Admin (Cấp 100)
        </span>
      );
    }
    if (maxRank >= 50) {
      return (
        <span className="badge" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", borderColor: "rgba(59, 130, 246, 0.3)" }}>
          <FiShield size={12} style={{ marginRight: 4 }} /> Admin (Cấp 50)
        </span>
      );
    }
    return (
      <span className="badge neutral">
        Thành viên (Cấp {maxRank || 10})
      </span>
    );
  };

  return (
    <>
      <section className="stats">
        <div className="stat">
          <div className="stat-icon" style={{ display: "grid", placeItems: "center" }}>
            <FiUsers size={20} />
          </div>
          <div>
            <strong>{q.data?.length ?? 0}</strong>
            <span>Tổng số người dùng</span>
          </div>
        </div>

        <div className="stat success">
          <div className="stat-icon" style={{ display: "grid", placeItems: "center" }}>
            <FiCheckCircle size={20} />
          </div>
          <div>
            <strong>{activeCount}</strong>
            <span>Tài khoản hoạt động</span>
          </div>
        </div>

        <div className="stat danger">
          <div className="stat-icon" style={{ display: "grid", placeItems: "center" }}>
            <FiSlash size={20} />
          </div>
          <div>
            <strong>{blockedCount}</strong>
            <span>Tài khoản bị khóa</span>
          </div>
        </div>

        <div className="stat warn">
          <div className="stat-icon" style={{ display: "grid", placeItems: "center" }}>
            <FiShield size={20} />
          </div>
          <div>
            <strong>{new Set(q.data?.flatMap((x) => x.roles.map((r) => r.role.name))).size ?? 0}</strong>
            <span>Vai trò đang kích hoạt</span>
          </div>
        </div>
      </section>

      {resetSuccessMessage && (
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
            marginBottom: "1rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FiCheck size={18} />
            <span>{resetSuccessMessage}</span>
          </div>
          <button
            onClick={() => setResetSuccessMessage(null)}
            style={{ background: "none", border: "none", color: "#10b981", cursor: "pointer", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="panel">
        <div className="panel-head" style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ position: "relative", width: 280 }}>
            <span
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted, #8b9bb4)",
                display: "grid",
                placeItems: "center"
              }}
            >
              <FiSearch size={16} />
            </span>
            <input
              className="input"
              style={{ width: "100%", paddingLeft: "34px" }}
              placeholder="Tìm kiếm theo tên, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {q.isLoading ? (
          <div className="loading">Đang tải danh sách người dùng…</div>
        ) : q.isError ? (
          <div className="empty error">Không thể tải danh sách người dùng.</div>
        ) : users.length === 0 ? (
          <div className="empty">
            <div className="empty-icon" style={{ display: "grid", placeItems: "center" }}>
              <FiUsers size={32} />
            </div>
            Không tìm thấy người dùng nào phù hợp.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Cấp bậc (Level/Rank)</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const name = u.displayName ?? u.email;
                  const targetMaxRank = u.roles.length > 0 ? Math.max(...u.roles.map((r) => r.role.rank)) : 0;
                  const isSelf = u.id === currentUser?.id;
                  // Không được thao tác nếu cùng hoặc cao hơn rank
                  const cannotAct = isSelf || currentMaxRank <= targetMaxRank;

                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="person">
                          <UserAvatar name={name} url={u.avatarUrl} size={34} />
                          <div>
                            <strong>
                              <Link href={`/users/${u.id}`}>{u.displayName ?? "Người dùng chưa đặt tên"}</Link>
                            </strong>
                            <span>{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {getRankBadge(u)}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${u.status === "BLOCKED" ? "danger" : "success"}`}>
                          <i className="dot" />
                          {u.status === "BLOCKED" ? "Bị khóa" : "Hoạt động"}
                        </span>
                      </td>
                      <td>
                        <div className="actions" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <Link className="btn secondary sm" href={`/users/${u.id}`} title="Xem chi tiết & Phân quyền động">
                            Chi tiết
                          </Link>

                          {canAssignRoles && (
                            <button
                              className="btn secondary sm"
                              disabled={cannotAct}
                              title={
                                cannotAct
                                  ? "Không thể phân vai trò cho tài khoản cùng hoặc cao hơn cấp bậc"
                                  : "Gán hoặc gỡ vai trò trực tiếp cho người dùng"
                              }
                              onClick={() => setSelectedUserForRoleAssign(u)}
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <FiShield size={13} />
                              Gán vai trò
                            </button>
                          )}

                          {canUpdateUser && (
                            <button
                              className="btn secondary sm"
                              disabled={cannotAct || resetPass.isPending}
                              title={
                                cannotAct
                                  ? "Không thể đổi mật khẩu của tài khoản cùng hoặc cao hơn cấp bậc"
                                  : "Cấp mật khẩu tạm thời 24h gửi về email của người dùng"
                              }
                              onClick={() => setSelectedUserForReset(u)}
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <FiKey size={13} />
                              Mật khẩu tạm
                            </button>
                          )}

                          {canBlockUser && (
                            <button
                              className={`btn sm ${u.status === "BLOCKED" ? "secondary" : "danger"}`}
                              disabled={cannotAct || m.isPending}
                              title={cannotAct ? "Không thể khóa tài khoản cùng hoặc cao hơn cấp bậc" : undefined}
                              onClick={() =>
                                m.mutate({
                                  action: u.status === "BLOCKED" ? "unblock" : "block",
                                  id: u.id
                                })
                              }
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              {u.status === "BLOCKED" ? (
                                <>
                                  <FiUnlock size={13} /> Mở khóa
                                </>
                              ) : (
                                <>
                                  <FiLock size={13} /> Khóa
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal xác nhận cấp mật khẩu tạm */}
      {selectedUserForReset && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(10, 15, 29, 0.8)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem"
          }}
        >
          <div
            className="panel"
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "var(--card, #131b2e)",
              border: "1px solid var(--border, #23314d)",
              borderRadius: "14px",
              padding: "1.75rem",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", color: "var(--warn, #f59e0b)" }}>
              <FiAlertCircle size={26} />
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text, #fff)" }}>
                Cấp mật khẩu tạm thời
              </h3>
            </div>
            <p style={{ fontSize: "0.92rem", color: "var(--text-muted, #8b9bb4)", lineHeight: 1.5, margin: "0 0 1.25rem" }}>
              Hệ thống sẽ tạo một mật khẩu ngẫu nhiên an toàn (hiệu lực <strong>24 giờ</strong>) và gửi tới hòm thư của:{" "}
              <strong style={{ color: "var(--text, #fff)" }}>{selectedUserForReset.email}</strong>.
              <br />
              <br />
              Đồng thời, mọi phiên đăng nhập hiện tại của người dùng này sẽ bị thu hồi và họ bắt buộc phải đổi mật khẩu mới ngay khi đăng nhập.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                className="btn secondary"
                disabled={resetPass.isPending}
                onClick={() => setSelectedUserForReset(null)}
              >
                Hủy bỏ
              </button>
              <button
                className="btn"
                disabled={resetPass.isPending}
                onClick={handleConfirmResetPassword}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
              >
                <FiKey size={15} />
                {resetPass.isPending ? "Đang gửi email..." : "Xác nhận cấp mật khẩu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gán vai trò nhanh cho người dùng */}
      {selectedUserForRoleAssign && (
        <AssignRoleModal
          user={selectedUserForRoleAssign}
          onClose={() => setSelectedUserForRoleAssign(null)}
        />
      )}
    </>
  );
}
