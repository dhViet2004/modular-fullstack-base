"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useId, type ReactNode } from "react";
import { AppShell, Sidebar } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/ui/role-badge";
import { InlineAlert } from "@/components/ui/feedback";

import { getNavigationItems, getRoleFlags } from "../permissions";
import { getAccountTab, getPostLoginPath } from "../post-login-route";
import { useAuth } from "./auth-provider";
import { LogoutButton } from "./logout-button";
import { SessionRecovery } from "./session-recovery";

function AccountNavigation({
  items,
  pathname,
}: {
  items: ReturnType<typeof getNavigationItems>;
  pathname: string;
}) {
  const value = useSearchParams().get("tab");
  const tab = getAccountTab(value);
  const activePath =
    pathname === "/account" && tab !== "overview"
      ? "/account?tab=" + tab
      : pathname === "/super-admin" &&
          (value === "email-verification" || value === "rbac")
        ? "/super-admin?tab=" + value
        : pathname;
  return <Sidebar items={items} pathname={activePath} />;
}

export function AuthNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, status, retrySession } = useAuth();
  const accountId = useId();
  const protectedRoute =
    pathname.startsWith("/account") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/super-admin");
  if (
    protectedRoute &&
    (status === "expired" || (status === "restore-error" && !user))
  ) {
    return (
      <div className="app-content" id="main-content" tabIndex={-1}>
        <SessionRecovery />
      </div>
    );
  }
  if (!user || !protectedRoute) return children;

  const { isSuperAdmin, isAdmin } = getRoleFlags(user.roles);
  const roleLabel = isSuperAdmin ? "SUPER ADMIN" : isAdmin ? "ADMIN" : "MEMBER";
  const items = getNavigationItems(user.roles, user.permissions);

  return (
    <AppShell
      homeHref={getPostLoginPath(user.roles)}
      navigation={
        <Suspense fallback={<Sidebar items={items} pathname={pathname} />}>
          <AccountNavigation items={items} pathname={pathname} />
        </Suspense>
      }
      account={
        <>
          <Button
            variant="ghost"
            className="shell-account-trigger"
            popoverTarget={accountId}
            aria-label="Account options"
          >
            <span className="shell-avatar" aria-hidden="true">
              {(user.displayName || user.email)
                .slice(0, 2)
                .toLocaleUpperCase("vi-VN")}
            </span>
            <RoleBadge
              role={isSuperAdmin ? "SUPER_ADMIN" : isAdmin ? "ADMIN" : "MEMBER"}
            >
              {roleLabel}
            </RoleBadge>
          </Button>
          <div
            id={accountId}
            popover="auto"
            className="shell-account-menu"
            role="group"
            aria-label="Account options"
          >
            <p>{user.displayName ?? user.email}</p>
            <p className="shell-account-email">{user.email}</p>
            <Link
              href="/account"
              onClick={(event) =>
                event.currentTarget
                  .closest<HTMLElement>("[popover]")
                  ?.hidePopover()
              }
            >
              {"T\u00e0i kho\u1ea3n"}
            </Link>
            <LogoutButton />
          </div>
        </>
      }
    >
      {status === "restore-error" || status === "loading" ? (
        <InlineAlert className="mb-6">
          {status === "loading"
            ? "Đang khôi phục phiên..."
            : "Kết nối bị gián đoạn. Chưa thể khôi phục phiên đăng nhập."}
          <Button
            className="ml-4"
            variant="secondary"
            loading={status === "loading"}
            onClick={retrySession}
          >
            Thử khôi phục lại
          </Button>
        </InlineAlert>
      ) : null}
      {children}
    </AppShell>
  );
}
