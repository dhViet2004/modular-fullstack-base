"use client";

import { useMemo, useState } from "react";
import { FiShield, FiPlus, FiTrash2, FiAlertCircle, FiX, FiLock } from "react-icons/fi";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAvailableRoles, useAssignUserRole, useRemoveUserRole } from "../hooks/use-users";
import { authClient } from "@/lib/auth/auth-client";
import type { User } from "../types/user";

interface AssignRoleModalProps {
  user: User;
  onClose: () => void;
}

export function AssignRoleModal({ user, onClose }: AssignRoleModalProps) {
  const rolesQuery = useAvailableRoles();
  const assignRole = useAssignUserRole();
  const removeRole = useRemoveUserRole();
  const [error, setError] = useState<string | null>(null);

  const currentUser = authClient.getUser();
  const currentMaxRank = useMemo(() => {
    if (!currentUser?.roles || currentUser.roles.length === 0) return 0;
    return Math.max(...currentUser.roles.map((r) => r.rank), 0);
  }, [currentUser]);

  const targetMaxRank = useMemo(() => {
    if (!user.roles || user.roles.length === 0) return 0;
    return Math.max(...user.roles.map((r) => r.role.rank), 0);
  }, [user.roles]);

  const isSelf = user.id === currentUser?.id;
  const cannotActOnUser = isSelf || currentMaxRank <= targetMaxRank;

  const [assignedRoleIds, setAssignedRoleIds] = useState<Set<string>>(
    () => new Set(user.roles?.map((r) => r.role.id) ?? [])
  );

  const handleToggleRole = async (role: { id: string }, isAssigned: boolean) => {
    setError(null);
    try {
      if (isAssigned) {
        await removeRole.mutateAsync({ userId: user.id, roleId: role.id });
        setAssignedRoleIds((prev) => {
          const next = new Set(prev);
          next.delete(role.id);
          return next;
        });
      } else {
        await assignRole.mutateAsync({ userId: user.id, roleId: role.id });
        setAssignedRoleIds((prev) => new Set(prev).add(role.id));
      }
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } } };
      setError(errObj?.response?.data?.error?.message || "Không thể cập nhật vai trò cho người dùng");
    }
  };

  const getRankColor = (rank: number) => {
    if (rank >= 100) return { bg: "#f3e8ff", text: "#7c3aed", border: "#ddd6fe" };
    if (rank >= 50) return { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" };
    return { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" };
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
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
          maxWidth: "520px",
          background: "#fff",
          border: "1px solid var(--line, #e4e8f0)",
          borderRadius: "16px",
          padding: "1.75rem",
          boxShadow: "0 20px 40px -12px rgba(15, 23, 42, 0.25)",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem"
        }}
      >
        {/* Header modal */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "#eff6ff",
                color: "#2563eb",
                display: "grid",
                placeItems: "center"
              }}
            >
              <FiShield size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--ink, #17213b)" }}>Phân vai trò người dùng</h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted, #69738a)" }}>
                Gán hoặc gỡ vai trò để phân quyền truy cập
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted, #69738a)",
              cursor: "pointer",
              padding: "4px"
            }}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Thông tin user mục tiêu */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.75rem 1rem",
            borderRadius: "10px",
            background: "var(--soft, #f5f7fb)",
            border: "1px solid var(--line, #e4e8f0)"
          }}
        >
          <UserAvatar name={user.displayName ?? user.email} url={user.avatarUrl} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ display: "block", fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--ink, #17213b)" }}>
              {user.displayName ?? "Người dùng chưa đặt tên"}
            </strong>
            <span style={{ fontSize: "0.82rem", color: "var(--muted, #69738a)" }}>{user.email}</span>
          </div>
          <span className={`badge ${user.status === "BLOCKED" ? "danger" : "success"}`}>
            <i className="dot" />
            {user.status === "BLOCKED" ? "Bị khóa" : "Hoạt động"}
          </span>
        </div>

        {cannotActOnUser && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 0.85rem",
              borderRadius: "8px",
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              color: "#d97706",
              fontSize: "0.82rem"
            }}
          >
            <FiLock size={16} style={{ flexShrink: 0 }} />
            <span>
              {isSelf
                ? "Bạn không thể tự sửa vai trò của chính mình."
                : "Tài khoản này có cấp bậc tương đương hoặc cao hơn bạn. Bạn không thể chỉnh sửa vai trò."}
            </span>
          </div>
        )}

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 0.85rem",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              color: "#ef4444",
              fontSize: "0.85rem"
            }}
          >
            <FiAlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Danh sách roles */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "280px", overflowY: "auto" }}>
          {rolesQuery.isLoading ? (
            <div className="loading" style={{ padding: "1rem" }}>
              Đang tải danh sách vai trò…
            </div>
          ) : (
            (rolesQuery.data?.roles ?? [])
              .filter((r) => r.name !== "SUPER_ADMIN" && r.rank < 100)
              .map((r) => {
                const isAssigned = assignedRoleIds.has(r.id);
                const isRankHigher = r.rank > currentMaxRank;
                const disabled = cannotActOnUser || isRankHigher || assignRole.isPending || removeRole.isPending;
                const color = getRankColor(r.rank);

                return (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.75rem 1rem",
                      borderRadius: "10px",
                      background: isAssigned ? "#eff6ff" : "#fff",
                      border: `1px solid ${isAssigned ? "#bfdbfe" : "var(--line, #e4e8f0)"}`,
                      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background: color.bg,
                          color: color.text,
                          border: `1px solid ${color.border}`,
                          display: "grid",
                          placeItems: "center"
                        }}
                      >
                        <FiShield size={16} />
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <strong style={{ fontSize: "0.92rem", color: "var(--ink, #17213b)" }}>{r.name}</strong>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              background: color.bg,
                              color: color.text,
                              border: `1px solid ${color.border}`,
                              fontWeight: 600
                            }}
                          >
                            Rank {r.rank}
                          </span>
                        </div>
                        {isRankHigher && (
                          <span style={{ fontSize: "0.75rem", color: "#d97706" }}>
                            (Vượt cấp bậc quyền hạn của bạn)
                          </span>
                        )}
                      </div>
                    </div>

                  <button
                    className={`btn sm ${isAssigned ? "danger" : "secondary"}`}
                    disabled={disabled}
                    onClick={() => handleToggleRole(r, isAssigned)}
                    style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    {isAssigned ? (
                      <>
                        <FiTrash2 size={13} /> Gỡ bỏ
                      </>
                    ) : (
                      <>
                        <FiPlus size={13} /> Gán vai trò
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer modal */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
          <button className="btn secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
