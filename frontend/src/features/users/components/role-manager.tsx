"use client";

import { useMemo, useState } from "react";
import {
  FiShield,
  FiPlus,
  FiSettings,
  FiTrash2,
  FiCheck,
  FiX,
  FiUsers,
  FiKey,
  FiAlertCircle,
  FiCheckCircle
} from "react-icons/fi";
import {
  useAvailableRoles,
  useCreateRole,
  useUpdateRolePermissions,
  useDeleteRole
} from "../hooks/use-users";
import { authClient } from "@/lib/auth/auth-client";
import { usePermissions } from "@/lib/auth/use-permission";
import type { UserRole, Permission } from "../types/user";

const SYSTEM_ROLES = ["SUPER_ADMIN", "ADMIN", "MEMBER"];

const PERMISSION_GROUPS: Record<string, { label: string; icon: string; prefix: string[] }> = {
  users: { label: "Quản lý Người dùng", icon: "👤", prefix: ["users.read", "users.create", "users.update", "users.block", "users.unblock"] },
  roles: { label: "Phân quyền & Vai trò", icon: "🔐", prefix: ["users.roles.read", "users.roles.assign", "users.roles.promote", "users.roles.demote"] },
  files: { label: "Quản lý Tệp tin", icon: "📁", prefix: ["files.read", "files.upload", "files.delete", "files.import", "files.export"] },
  sessions: { label: "Phiên đăng nhập", icon: "🛡️", prefix: ["sessions.read", "sessions.revoke"] },
  mail: { label: "Hòm thư điện tử", icon: "✉️", prefix: ["mail.read", "mail.send"] },
  jobs: { label: "Tác vụ nền & Lịch trình", icon: "⚙️", prefix: ["jobs.read", "jobs.create", "jobs.update", "jobs.delete", "jobs.run"] },
  system: { label: "Hệ thống & Nhật ký kiểm toán", icon: "📊", prefix: ["system.settings.read", "system.settings.update", "audit.read"] }
};

export function RoleManager() {
  const rolesQuery = useAvailableRoles();
  const createRole = useCreateRole();
  const updatePermissions = useUpdateRolePermissions();
  const deleteRole = useDeleteRole();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<UserRole | null>(null);

  // Form create state
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleRank, setNewRoleRank] = useState<number>(20);
  const [newRolePermIds, setNewRolePermIds] = useState<string[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form edit permissions state
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());
  const [editError, setEditError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentUser = authClient.getUser();
  const { hasPermission } = usePermissions(currentUser);
  const canManageRoles = hasPermission("users.roles.assign");

  const currentMaxRank = useMemo(() => {
    if (!currentUser?.roles || currentUser.roles.length === 0) return 0;
    return Math.max(...currentUser.roles.map((r) => r.rank), 0);
  }, [currentUser]);

  const allPermissions = useMemo(() => rolesQuery.data?.permissions ?? [], [rolesQuery.data]);

  const handleOpenEditPermissions = (role: UserRole) => {
    setEditingRole(role);
    setEditError(null);
    const assignedIds = new Set((role.permissions ?? []).map((p) => p.permissionId));
    setSelectedPermIds(assignedIds);
  };

  const handleSavePermissions = async () => {
    if (!editingRole) return;
    try {
      await updatePermissions.mutateAsync({
        roleId: editingRole.id,
        permissionIds: Array.from(selectedPermIds)
      });
      setSuccessMessage(`Đã cập nhật quyền hạn cho vai trò ${editingRole.name} thành công.`);
      setEditingRole(null);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } } };
      setEditError(errObj?.response?.data?.error?.message || "Không thể lưu quyền cho vai trò.");
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    try {
      await createRole.mutateAsync({
        name: newRoleName.trim().toUpperCase(),
        rank: Number(newRoleRank),
        permissionIds: newRolePermIds
      });
      setSuccessMessage(`Đã tạo vai trò mới "${newRoleName.toUpperCase()}" thành công.`);
      setIsCreateModalOpen(false);
      setNewRoleName("");
      setNewRoleRank(20);
      setNewRolePermIds([]);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } } };
      setCreateError(errObj?.response?.data?.error?.message || "Không thể tạo vai trò mới.");
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    try {
      await deleteRole.mutateAsync(roleToDelete.id);
      setSuccessMessage(`Đã xóa vai trò "${roleToDelete.name}" thành công.`);
      setRoleToDelete(null);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } } };
      alert(errObj?.response?.data?.error?.message || "Không thể xóa vai trò này.");
    }
  };

  const togglePermissionSelection = (permId: string) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const toggleGroupSelection = (permList: Permission[]) => {
    const permIds = permList.map((p) => p.id);
    const allSelected = permIds.every((id) => selectedPermIds.has(id));
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        permIds.forEach((id) => next.delete(id));
      } else {
        permIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const getRankBadge = (rank: number) => {
    if (rank >= 100) return { label: `Super Admin (Rank ${rank})`, bg: "#f3e8ff", text: "#7c3aed", border: "#ddd6fe" };
    if (rank >= 50) return { label: `Quản trị viên (Rank ${rank})`, bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" };
    return { label: `Cấp bậc ${rank}`, bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Thống kê vai trò */}
      <section className="stats">
        <div className="stat">
          <div className="stat-icon" style={{ display: "grid", placeItems: "center" }}>
            <FiShield size={20} />
          </div>
          <div>
            <strong>{rolesQuery.data?.roles.length ?? 0}</strong>
            <span>Tổng số vai trò</span>
          </div>
        </div>

        <div className="stat success">
          <div className="stat-icon" style={{ display: "grid", placeItems: "center" }}>
            <FiKey size={20} />
          </div>
          <div>
            <strong>{allPermissions.length}</strong>
            <span>Quyền hạn hệ thống</span>
          </div>
        </div>

        <div className="stat warn">
          <div className="stat-icon" style={{ display: "grid", placeItems: "center" }}>
            <FiUsers size={20} />
          </div>
          <div>
            <strong>
              {rolesQuery.data?.roles.reduce((acc, r) => acc + (r._count?.users ?? 0), 0) ?? 0}
            </strong>
            <span>Lượt phân bổ vai trò</span>
          </div>
        </div>
      </section>

      {successMessage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.85rem 1.25rem",
            borderRadius: "10px",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#10b981",
            fontSize: "0.9rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FiCheckCircle size={18} />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            style={{ background: "none", border: "none", color: "#10b981", cursor: "pointer", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Bảng danh sách vai trò */}
      <div className="panel">
        <div className="panel-head" style={{ display: "flex", justifyContent: "flex-end" }}>
          {canManageRoles && (
            <button
              className="btn"
              onClick={() => {
                setCreateError(null);
                setIsCreateModalOpen(true);
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
            >
              <FiPlus size={16} /> Tạo vai trò mới
            </button>
          )}
        </div>

        {rolesQuery.isLoading ? (
          <div className="loading">Đang tải danh sách vai trò…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.25rem" }}>
            {rolesQuery.data?.roles.map((r) => {
              const badge = getRankBadge(r.rank);
              const isSystemRole = SYSTEM_ROLES.includes(r.name);
              const cannotEdit = r.rank >= currentMaxRank;
              const permissions = r.permissions ?? [];

              return (
                <div
                  key={r.id}
                  style={{
                    padding: "1.25rem 1.5rem",
                    borderRadius: "12px",
                    background: "#fff",
                    border: "1px solid var(--line, #e4e8f0)",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "10px",
                          background: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`,
                          display: "grid",
                          placeItems: "center"
                        }}
                      >
                        <FiShield size={22} />
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--ink, #17213b)" }}>{r.name}</h3>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.border}`,
                              fontWeight: 600
                            }}
                          >
                            {badge.label}
                          </span>
                          {isSystemRole && (
                            <span className="badge neutral" style={{ fontSize: "0.7rem" }}>
                              Hệ thống cốt lõi
                            </span>
                          )}
                        </div>
                        <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--muted, #69738a)" }}>
                          Đang được gán cho <strong>{r._count?.users ?? 0}</strong> người dùng • Sở hữu{" "}
                          <strong>{permissions.length}</strong> quyền hạn trực tiếp
                        </p>
                      </div>
                    </div>

                    {canManageRoles && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <button
                          className="btn secondary sm"
                          disabled={cannotEdit}
                          title={
                            cannotEdit
                              ? "Không thể chỉnh sửa vai trò có cấp bậc ngang hoặc cao hơn bạn"
                              : "Cấu hình danh sách quyền hạn gán vào vai trò này"
                          }
                          onClick={() => handleOpenEditPermissions(r)}
                          style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
                        >
                          <FiSettings size={14} /> Cấu hình quyền ({permissions.length})
                        </button>

                        {!isSystemRole && (
                          <button
                            className="btn danger sm"
                            disabled={cannotEdit || deleteRole.isPending}
                            title={cannotEdit ? "Không thể xóa vai trò có cấp bậc ngang hoặc cao hơn bạn" : "Xóa vai trò tùy chỉnh"}
                            onClick={() => setRoleToDelete(r)}
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <FiTrash2 size={13} /> Xóa
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Danh sách các quyền đang được gán */}
                  <div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                      {permissions.length > 0 ? (
                        permissions.map((p) => (
                          <span
                            key={p.permissionId}
                            style={{
                              padding: "2px 8px",
                              fontSize: "0.75rem",
                              fontFamily: "monospace",
                              borderRadius: "6px",
                              background: "var(--soft, #f5f7fb)",
                              color: "var(--brand, #6558f5)",
                              border: "1px solid var(--line, #e4e8f0)"
                            }}
                          >
                            {p.permission.name}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "var(--muted, #69738a)", fontStyle: "italic" }}>
                          Chưa có quyền hạn trực tiếp nào. Người dùng sở hữu vai trò này sẽ hưởng quyền theo kế thừa thứ bậc cấp dưới.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Tạo vai trò mới */}
      {isCreateModalOpen && (
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
              maxWidth: "540px",
              background: "#fff",
              border: "1px solid var(--line, #e4e8f0)",
              borderRadius: "16px",
              padding: "1.75rem",
              boxShadow: "0 20px 40px -12px rgba(15, 23, 42, 0.25)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: "#eff6ff",
                    color: "#2563eb",
                    display: "grid",
                    placeItems: "center"
                  }}
                >
                  <FiPlus size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--ink, #17213b)" }}>Tạo vai trò mới</h3>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted, #69738a)" }}>
                    Định nghĩa vai trò và cấp bậc trong hệ thống
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: "none", border: "none", color: "var(--muted, #69738a)", cursor: "pointer", padding: "4px" }}
              >
                <FiX size={20} />
              </button>
            </div>

            {createError && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "8px",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  color: "#ef4444",
                  fontSize: "0.85rem",
                  marginBottom: "1rem"
                }}
              >
                <FiAlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRole} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <label className="field">
                <span>Tên vai trò (Chữ hoa, gạch dưới)</span>
                <input
                  className="input"
                  required
                  placeholder="VD: EDITOR, CONTENT_MANAGER, AUDITOR"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value.toUpperCase())}
                />
              </label>

              <label className="field">
                <span>Cấp bậc quyền hạn (Rank: 1 - {Math.min(99, currentMaxRank - 1)})</span>
                <input
                  type="number"
                  className="input"
                  required
                  min={1}
                  max={Math.min(99, currentMaxRank - 1)}
                  value={newRoleRank}
                  onChange={(e) => setNewRoleRank(Number(e.target.value))}
                />
                <span style={{ fontSize: "0.78rem", color: "var(--muted, #69738a)", marginTop: "3px" }}>
                  Gợi ý: Member (10), Admin (50), Super Admin (100). Rank cao hơn sẽ tự động kế thừa toàn bộ quyền của các rank bên dưới.
                </span>
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.75rem" }}>
                <button type="button" className="btn secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={createRole.isPending || !newRoleName || !newRoleRank}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <FiPlus size={15} />
                  {createRole.isPending ? "Đang tạo…" : "Xác nhận tạo vai trò"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cấu hình quyền cho vai trò (Gán permissions vào role) */}
      {editingRole && (
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
              maxWidth: "760px",
              maxHeight: "90vh",
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
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    background: "#f3e8ff",
                    color: "#7c3aed",
                    display: "grid",
                    placeItems: "center"
                  }}
                >
                  <FiKey size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--ink, #17213b)" }}>
                    Cấu hình quyền hạn cho: {editingRole.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted, #69738a)" }}>
                    Chọn các quyền được gán trực tiếp vào vai trò này ({selectedPermIds.size}/{allPermissions.length} quyền đã chọn)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingRole(null)}
                style={{ background: "none", border: "none", color: "var(--muted, #69738a)", cursor: "pointer", padding: "4px" }}
              >
                <FiX size={22} />
              </button>
            </div>

            {editError && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "8px",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  color: "#ef4444",
                  fontSize: "0.85rem"
                }}
              >
                <FiAlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{editError}</span>
              </div>
            )}

            {/* Danh sách các nhóm permissions */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                paddingRight: "6px"
              }}
            >
              {Object.entries(PERMISSION_GROUPS).map(([key, grp]) => {
                const groupPerms = allPermissions.filter((p) => grp.prefix.includes(p.name));
                if (groupPerms.length === 0) return null;

                const allInGroupSelected = groupPerms.every((p) => selectedPermIds.has(p.id));

                return (
                  <div
                    key={key}
                    style={{
                      padding: "1rem 1.25rem",
                      borderRadius: "10px",
                      background: "var(--soft, #f5f7fb)",
                      border: "1px solid var(--line, #e4e8f0)"
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "0.75rem"
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--ink, #17213b)" }}>
                        <span>{grp.icon}</span> {grp.label}
                      </span>
                      <button
                        type="button"
                        className="btn secondary sm"
                        style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                        onClick={() => toggleGroupSelection(groupPerms)}
                      >
                        {allInGroupSelected ? "Bỏ chọn nhóm" : "Chọn toàn bộ nhóm"}
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.5rem" }}>
                      {groupPerms.map((p) => {
                        const checked = selectedPermIds.has(p.id);
                        return (
                          <label
                            key={p.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.45rem 0.65rem",
                              borderRadius: "6px",
                              background: checked ? "#eff6ff" : "#fff",
                              border: `1px solid ${checked ? "#bfdbfe" : "var(--line, #e4e8f0)"}`,
                              cursor: "pointer",
                              fontSize: "0.82rem",
                              fontFamily: "monospace"
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermissionSelection(p.id)}
                            />
                            <span style={{ color: checked ? "#1d4ed8" : "var(--ink, #17213b)" }}>{p.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "0.5rem",
                borderTop: "1px solid var(--line, #e4e8f0)"
              }}
            >
              <div style={{ fontSize: "0.85rem", color: "var(--muted, #69738a)" }}>
                Đã chọn: <strong style={{ color: "var(--ink, #17213b)" }}>{selectedPermIds.size}</strong> quyền hạn
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button type="button" className="btn secondary" onClick={() => setEditingRole(null)}>
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={updatePermissions.isPending}
                  onClick={handleSavePermissions}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <FiCheck size={16} />
                  {updatePermissions.isPending ? "Đang lưu quyền…" : "Lưu cấu hình quyền"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận xóa role */}
      {roleToDelete && (
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
              maxWidth: "440px",
              background: "#fff",
              border: "1px solid var(--line, #e4e8f0)",
              borderRadius: "14px",
              padding: "1.75rem",
              boxShadow: "0 20px 40px -12px rgba(15, 23, 42, 0.25)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", color: "var(--danger, #d94a5c)" }}>
              <FiAlertCircle size={26} />
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--ink, #17213b)" }}>
                Xác nhận xóa vai trò
              </h3>
            </div>
            <p style={{ fontSize: "0.92rem", color: "var(--muted, #69738a)", lineHeight: 1.5, margin: "0 0 1.25rem" }}>
              Bạn có chắc chắn muốn xóa vai trò <strong style={{ color: "var(--ink, #17213b)" }}>{roleToDelete.name}</strong>?
              Hành động này sẽ gỡ bỏ vai trò này khỏi toàn bộ người dùng đang sở hữu nó.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button className="btn secondary" onClick={() => setRoleToDelete(null)}>
                Hủy
              </button>
              <button
                className="btn danger"
                disabled={deleteRole.isPending}
                onClick={handleDeleteRole}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
              >
                <FiTrash2 size={14} />
                {deleteRole.isPending ? "Đang xóa…" : "Xóa vai trò"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
