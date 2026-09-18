"use client";

import { useState } from "react";
import { FiKey, FiLock, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import { usersApi } from "@/features/users/api/users.api";
import { authClient } from "@/lib/auth/auth-client";

interface MustChangePasswordModalProps {
  onSuccess: () => void;
}

export function MustChangePasswordModal({ onSuccess }: MustChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError("Vui lòng nhập mật khẩu tạm thời hiện tại.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp với mật khẩu mới.");
      return;
    }

    try {
      setLoading(true);
      await usersApi.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions
      });

      // Cập nhật authClient trạng thái mustChangePassword = false
      authClient.updateUser({ mustChangePassword: false });
      onSuccess();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
      const message =
        errObj?.response?.data?.error?.message ||
        errObj?.response?.data?.message ||
        "Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(10, 15, 29, 0.85)",
        backdropFilter: "blur(8px)",
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
          maxWidth: "480px",
          background: "var(--card, #131b2e)",
          border: "1px solid var(--border, #23314d)",
          borderRadius: "16px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.45)",
          padding: "2rem"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              margin: "0 auto 1rem",
              borderRadius: "50%",
              background: "rgba(245, 158, 11, 0.15)",
              color: "var(--warn, #f59e0b)",
              display: "grid",
              placeItems: "center"
            }}
          >
            <FiKey size={28} />
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
            Bắt buộc đổi mật khẩu mới
          </h2>
          <p style={{ color: "var(--text-muted, #8b9bb4)", fontSize: "0.9rem", margin: 0, lineHeight: 1.5 }}>
            Bạn đang đăng nhập bằng mật khẩu tạm thời được cấp bởi Quản trị viên (hiệu lực trong 24 giờ). Vui lòng đặt mật khẩu mới để bảo vệ tài khoản và tiếp tục sử dụng hệ thống.
          </p>
        </div>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#ef4444",
              fontSize: "0.875rem",
              marginBottom: "1.25rem"
            }}
          >
            <FiAlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <label className="field">
            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <FiLock size={14} /> Mật khẩu tạm thời hiện tại
            </span>
            <input
              type="password"
              className="input"
              required
              placeholder="Nhập mật khẩu tạm nhận từ email"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>

          <label className="field">
            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <FiKey size={14} /> Mật khẩu mới
            </span>
            <input
              type="password"
              className="input"
              required
              placeholder="Ít nhất 8 ký tự (chữ hoa, số, ký tự đặc biệt)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>

          <label className="field">
            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <FiCheckCircle size={14} /> Xác nhận mật khẩu mới
            </span>
            <input
              type="password"
              className="input"
              required
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.85rem",
              color: "var(--text-muted, #8b9bb4)",
              cursor: "pointer",
              margin: "0.25rem 0"
            }}
          >
            <input
              type="checkbox"
              checked={revokeOtherSessions}
              onChange={(e) => setRevokeOtherSessions(e.target.checked)}
            />
            <span>Đăng xuất khỏi tất cả các thiết bị và trình duyệt khác</span>
          </label>

          <button
            type="submit"
            className="btn"
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            style={{
              width: "100%",
              marginTop: "0.5rem",
              padding: "0.75rem",
              fontSize: "0.95rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
            }}
          >
            {loading ? "Đang xử lý đổi mật khẩu..." : "Cập nhật mật khẩu & Tiếp tục"}
          </button>
        </form>
      </div>
    </div>
  );
}
