"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getNavigationItems, getRoleFlags } from "../permissions";
import { getPostLoginPath } from "../post-login-route";
import { useAuth } from "./auth-provider";
import { LogoutButton } from "./logout-button";

export function AuthNavigation() {
  const pathname = usePathname();
  const { user } = useAuth();
  if (
    !user ||
    !(pathname.startsWith("/account") || pathname.startsWith("/admin") || pathname.startsWith("/super-admin"))
  ) return null;

  const { isSuperAdmin, isAdmin } = getRoleFlags(user.roles);
  const roleLabel = isSuperAdmin ? "SUPER ADMIN" : isAdmin ? "ADMIN" : "MEMBER";

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--ink)] bg-[var(--paper)] px-[clamp(24px,6vw,88px)] py-4 shadow-[0_3px_0_rgba(21,21,15,0.12)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link className="flex items-center gap-3 font-mono text-xs font-semibold tracking-[0.12em]" href={getPostLoginPath(user.roles)}>
          <span className="grid size-9 place-items-center bg-[var(--ink)] text-[var(--paper)]">CS</span>
          <span>CORESTACK <span className="text-[var(--signal)]">/ {roleLabel}</span></span>
        </Link>
        <nav aria-label="Điều hướng tài khoản" className="flex flex-wrap gap-2">
          {getNavigationItems(user.roles, user.permissions).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={`border border-[var(--ink)] px-3 py-2 text-xs ${pathname === item.href ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper)]"}`}
            >
              {item.label}
            </Link>
          ))}
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
