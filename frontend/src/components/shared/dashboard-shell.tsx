"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FiHome,
  FiUsers,
  FiFolder,
  FiMail,
  FiShield,
  FiSettings,
  FiLogOut,
  FiHelpCircle,
  FiBell,
  FiClock,
  FiChevronDown,
  FiChevronRight
} from "react-icons/fi";
import { Brand } from "./brand";
import { UserAvatar } from "./user-avatar";
import { authApi } from "@/features/auth/api/auth.api";
import { usersApi } from "@/features/users/api/users.api";
import { authClient, type AuthUser } from "@/lib/auth/auth-client";
import { usePermissions } from "@/lib/auth/use-permission";
import { MustChangePasswordModal } from "@/features/auth/components/must-change-password-modal";

const ALL_OTHER_LINKS = [
  { href: "/files", icon: <FiFolder size={18} />, label: "Files", permission: "files.read" },
  { href: "/mail", icon: <FiMail size={18} />, label: "Mail", permission: "mail.read" },
  { href: "/jobs", icon: <FiClock size={18} />, label: "Jobs", permission: "jobs.read" },
  { href: "/sessions", icon: <FiShield size={18} />, label: "Sessions", permission: "sessions.read" },
  { href: "/settings", icon: <FiSettings size={18} />, label: "Settings", permission: "system.settings.read" }
];

const roleLabel = (role?: string) => {
  if (!role) return "Member";
  if (role === "SUPER_ADMIN") return "Super Admin";
  if (role === "ADMIN") return "Admin";
  if (role === "MEMBER") return "Member";
  return role;
};

function NavigationLinks({ user }: { user: AuthUser | null }) {
  const path = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const isUsersActive = path.startsWith("/users");
  const [isUsersOpen, setIsUsersOpen] = useState(isUsersActive);

  const { hasPermission } = usePermissions(user);

  const canReadUsers = hasPermission("users.read");
  const canReadRoles = hasPermission("users.roles.read");
  const showUsersDropdown = canReadUsers || canReadRoles;

  useEffect(() => {
    if (isUsersActive) {
      setIsUsersOpen(true);
    }
  }, [isUsersActive]);

  return (
    <>
      {/* Dashboard */}
      <Link
        className={`nav-link ${path === "/dashboard" ? "active" : ""}`}
        href="/dashboard"
      >
        <span className="nav-icon" style={{ display: "grid", placeItems: "center" }}>
          <FiHome size={18} />
        </span>
        <span>Dashboard</span>
      </Link>

      {/* DROPDOWN MENU: Users & Roles */}
      {showUsersDropdown && (
        <div>
          <div
            onClick={() => setIsUsersOpen((prev) => !prev)}
            className={`nav-link ${isUsersActive ? "active" : ""}`}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              userSelect: "none"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span className="nav-icon" style={{ display: "grid", placeItems: "center" }}>
                <FiUsers size={18} />
              </span>
              <span>Users & Roles</span>
            </div>
            <span style={{ display: "grid", placeItems: "center", color: "var(--muted, #69738a)" }}>
              {isUsersOpen ? <FiChevronDown size={15} /> : <FiChevronRight size={15} />}
            </span>
          </div>

          {/* 2 Sub-menus */}
          {isUsersOpen && (
            <div
              style={{
                marginLeft: "18px",
                paddingLeft: "10px",
                borderLeft: "2px solid var(--line, #e4e8f0)",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                marginTop: "4px",
                marginBottom: "6px"
              }}
            >
              {/* Sub-menu 1: Users */}
              {canReadUsers && (
                <Link
                  href="/users?tab=users"
                  className={`nav-link ${isUsersActive && currentTab !== "roles" ? "active" : ""}`}
                  style={{ padding: "8px 10px", fontSize: "13px" }}
                >
                  <span className="nav-icon" style={{ display: "grid", placeItems: "center" }}>
                    <FiUsers size={15} />
                  </span>
                  <span>Users</span>
                </Link>
              )}

              {/* Sub-menu 2: Roles */}
              {canReadRoles && (
                <Link
                  href="/users?tab=roles"
                  className={`nav-link ${isUsersActive && currentTab === "roles" ? "active" : ""}`}
                  style={{ padding: "8px 10px", fontSize: "13px" }}
                >
                  <span className="nav-icon" style={{ display: "grid", placeItems: "center" }}>
                    <FiShield size={15} />
                  </span>
                  <span>Roles & Permissions</span>
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Other navigation links */}
      {ALL_OTHER_LINKS.filter((x) => !x.permission || hasPermission(x.permission)).map((x) => (
        <Link
          className={`nav-link ${path === x.href || (x.href !== "/" && path.startsWith(x.href)) ? "active" : ""}`}
          href={x.href}
          key={x.href}
        >
          <span className="nav-icon" style={{ display: "grid", placeItems: "center" }}>
            {x.icon}
          </span>
          <span>{x.label}</span>
        </Link>
      ))}
    </>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const local = authClient.getUser();
    setUser(local);
    // Đồng bộ lại hồ sơ và cờ quyền hạn mới nhất từ backend
    usersApi
      .me()
      .then((fresh) => {
        authClient.updateUser(fresh);
        setUser(fresh);
      })
      .catch(() => {});
  }, []);

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      authClient.clear();
      router.push("/login");
    }
  };

  const name = user?.displayName || user?.email || "Tài khoản";

  return (
    <div className="dashboard">
      {user?.mustChangePassword && (
        <MustChangePasswordModal
          onSuccess={() => {
            setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
          }}
        />
      )}
      <aside className="sidebar">
        <Brand />
        <div className="nav-title">WORKSPACE</div>
        <Suspense fallback={<div className="loading" style={{ padding: "10px" }}>Loading menu…</div>}>
          <NavigationLinks user={user} />
        </Suspense>
        <div className="sidebar-user">
          <UserAvatar name={name} url={user?.avatarUrl} />
          <div className="user-meta">
            <strong title={name}>{name}</strong>
            <span title={roleLabel(user?.roles[0]?.name)}>{roleLabel(user?.roles[0]?.name)}</span>
          </div>
          <button
            aria-label="Logout"
            title="Logout"
            className="icon-button"
            onClick={logout}
            style={{ display: "grid", placeItems: "center" }}
          >
            <FiLogOut size={16} />
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar" style={{ justifyContent: "flex-end" }}>
          <div className="top-actions">
            <button className="icon-button" aria-label="Help" title="Help" style={{ display: "grid", placeItems: "center" }}>
              <FiHelpCircle size={16} />
            </button>
            <button className="icon-button" aria-label="Notifications" title="Notifications" style={{ display: "grid", placeItems: "center" }}>
              <FiBell size={16} />
            </button>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
