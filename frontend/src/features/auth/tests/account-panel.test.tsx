import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../api/auth.api";
import { AccountPanel } from "../components/account-panel";

const fixture = vi.hoisted(() => ({
  tab: null as string | null,
  user: null as AuthenticatedUser | null,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => fixture.tab }),
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("../components/auth-provider", () => ({
  useAuth: () => ({ user: fixture.user, isLoading: false }),
}));

beforeEach(() => {
  fixture.tab = null;
  fixture.user = {
    id: "merged-account",
    displayName: "Account Owner",
    email: "owner@example.com",
    status: "ACTIVE",
    createdAt: "2026-10-01T09:00:00Z",
    updatedAt: "2026-10-09T09:00:00Z",
    emailVerifiedAt: "2026-10-09T00:30:00Z",
    hasPassword: true,
    roles: ["MEMBER"],
    permissions: ["profile:read:self", "profile:update:self"],
  };
});

function render() {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <AccountPanel />
    </QueryClientProvider>,
  );
}

it.each([null, "info"])(
  "keeps profile, permissions, dates and security on the main account view for tab %s",
  (tab) => {
    fixture.tab = tab;
    const html = render();
    expect(html.match(/Account Owner/g)).toHaveLength(1);
    expect(html.match(/owner@example.com/g)).toHaveLength(1);
    expect(html).toContain("ACTIVE");
    expect(html).toContain("Ng\u00e0y tham gia");
    expect(html).toContain(
      new Date(fixture.user!.createdAt).toLocaleString("vi-VN"),
    );
    expect(html).toContain(
      new Date(fixture.user!.emailVerifiedAt!).toLocaleString("vi-VN"),
    );
    expect(html).toContain("Th\u00e0nh vi\u00ean");
    expect(html).toContain("profile:read:self");
    expect(html).toContain("profile:update:self");
    expect(html).toContain('href="/account?tab=security"');
    expect(html.match(/href="\/account\?tab=sessions"/g)).toHaveLength(1);
    expect(html).toContain('href="/account/files"');
    expect(html).not.toContain("member-email-notice");
    expect(html).not.toContain('href="/account?tab=info"');
  },
);

it("offers one resend action and the existing password setup for an unverified account", () => {
  fixture.user!.emailVerifiedAt = null;
  fixture.user!.hasPassword = false;
  const html = render();
  expect(html.match(/G\u1eedi l\u1ea1i email/g)).toHaveLength(1);
  expect(html).toContain("Ch\u01b0a x\u00e1c minh");
  expect(html).toContain("\u0110\u1eb7t m\u1eadt kh\u1ea9u");
  expect(html).not.toContain("G\u1eedi email x\u00e1c minh");
});

it("reuses the permission-aware navigation for administration shortcuts", () => {
  fixture.user!.roles = ["ADMIN", "MEMBER"];
  fixture.user!.permissions = ["users:read"];
  const html = render();
  expect(html).toContain('href="/admin"');
  expect(html).toContain('href="/admin/users"');
  expect(html).not.toContain('href="/admin/audit-logs"');
  expect(html).not.toContain("/super-admin");
});
