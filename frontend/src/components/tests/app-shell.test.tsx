import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/features/auth/api/auth.api";
import { AuthNavigation } from "@/features/auth/components/auth-navigation";
import { Sidebar } from "../app-shell";

const context = vi.hoisted(() => ({
  pathname: "/account",
  user: null as AuthenticatedUser | null,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => context.pathname,
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("@/features/auth/components/auth-provider", () => ({
  useAuth: () => ({ user: context.user, clearAuthenticatedUser: vi.fn() }),
}));

function renderNavigation() {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <AuthNavigation>
        <main id="main-content">Existing content</main>
      </AuthNavigation>
    </QueryClientProvider>,
  );
}

describe("app shell navigation", () => {
  beforeEach(() => {
    context.pathname = "/account";
    context.user = {
      id: "test-user",
      email: "test@example.com",
      displayName: "Test User",
      status: "ACTIVE",
      hasPassword: true,
      emailVerifiedAt: null,
      createdAt: "2026-10-08T00:00:00Z",
      updatedAt: "2026-10-08T00:00:00Z",
      roles: ["MEMBER"],
      permissions: [],
    };
  });

  it("preserves content without an authenticated shell on guest and public routes", () => {
    const user = context.user;
    context.user = null;
    expect(renderNavigation()).toBe(
      '<main id="main-content">Existing content</main>',
    );
    context.user = user;
    context.pathname = "/login";
    expect(renderNavigation()).toBe(
      '<main id="main-content">Existing content</main>',
    );
  });

  it.each([
    {
      role: "MEMBER",
      permissions: [],
      expected: ["/account/files", "/account"],
    },
    {
      role: "ADMIN",
      permissions: ["users:read"],
      expected: ["/admin", "/admin/users", "/account/files", "/account"],
    },
    {
      role: "SUPER_ADMIN",
      permissions: ["users:read", "audit:read"],
      expected: [
        "/super-admin",
        "/admin/users",
        "/admin/audit-logs",
        "/account/files",
        "/account",
      ],
    },
  ])(
    "renders $role entries using the existing permission mapping",
    ({ role, permissions, expected }) => {
      context.user!.roles = [role];
      context.user!.permissions = permissions;
      const html = renderNavigation();
      const navigation = html.match(/<nav[^>]*>(.*?)<\/nav>/)?.[1] ?? "";
      expect(
        [...navigation.matchAll(/href="([^"]+)"/g)].map((match) => match[1]),
      ).toEqual(expected);
      expect(html).toContain('id="main-content"');
      expect(html).toContain('popover="auto"');
      expect(html).toContain('role="group" aria-label="Account options"');
      expect(html).toContain('aria-label="Account options"');
      expect(html).toContain('aria-modal="true"');
    },
  );

  it("marks only the active leaf and leaves disabled entries non-interactive", () => {
    const html = renderToStaticMarkup(
      <Sidebar
        pathname="/account/files"
        items={[
          { href: "/account", label: "Account" },
          { href: "/account/files", label: "Files" },
          { href: "/unavailable", label: "Unavailable", disabled: true },
        ]}
      />,
    );
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(
      /<a(?=[^>]*href="\/account\/files")(?=[^>]*aria-current="page")/,
    );
    expect(html).toContain('aria-label="Files"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toContain('href="/unavailable"');
    expect(html).not.toContain("tabindex");
  });
});
