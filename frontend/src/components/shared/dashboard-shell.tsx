"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FiHome,
  FiUsers,
  FiFolder,
  FiMail,
  FiShield,
  FiSettings,
  FiLogOut,
  FiSearch,
  FiHelpCircle,
  FiBell
} from "react-icons/fi";
import { Brand } from "./brand";
import { UserAvatar } from "./user-avatar";
import { authApi } from "@/features/auth/api/auth.api";
import { authClient, type AuthUser } from "@/lib/auth/auth-client";

const links = [
  { href: "/dashboard", icon: <FiHome size={18} />, label: "Overview" },
  { href: "/users", icon: <FiUsers size={18} />, label: "Users" },
  { href: "/files", icon: <FiFolder size={18} />, label: "Files" },
  { href: "/mail", icon: <FiMail size={18} />, label: "Mail" },
  { href: "/sessions", icon: <FiShield size={18} />, label: "Sessions" },
  { href: "/settings", icon: <FiSettings size={18} />, label: "Settings" }
];

const roleLabel = (role?: string) =>
  role
    ? role
        .toLowerCase()
        .split("_")
        .map(word => word[0].toUpperCase() + word.slice(1))
        .join(" ")
    : "Member";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => setUser(authClient.getUser()), []);

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      authClient.clear();
      router.push("/login");
    }
  };

  const name = user?.displayName || user?.email || "Account";

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <Brand />
        <div className="nav-title">Workspace</div>
        {links.map(x => (
          <Link
            className={`nav-link ${path === x.href || (x.href !== "/" && path.startsWith(x.href)) ? "active" : ""}`}
            href={x.href}
            key={x.href}
          >
            <span className="nav-icon" style={{ display: "grid", placeItems: "center" }}>{x.icon}</span>
            <span>{x.label}</span>
          </Link>
        ))}
        <div className="sidebar-user">
          <UserAvatar name={name} url={user?.avatarUrl} />
          <div className="user-meta">
            <strong title={name}>{name}</strong>
            <span title={roleLabel(user?.roles[0]?.name)}>{roleLabel(user?.roles[0]?.name)}</span>
          </div>
          <button aria-label="Sign out" className="icon-button" onClick={logout} style={{ display: "grid", placeItems: "center" }}>
            <FiLogOut size={16} />
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="search">
            <span className="search-icon" style={{ display: "grid", placeItems: "center" }}>
              <FiSearch size={16} />
            </span>
            <input className="input" placeholder="Search workspace..." />
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Help" style={{ display: "grid", placeItems: "center" }}>
              <FiHelpCircle size={16} />
            </button>
            <button className="icon-button" aria-label="Notifications" style={{ display: "grid", placeItems: "center" }}>
              <FiBell size={16} />
            </button>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
