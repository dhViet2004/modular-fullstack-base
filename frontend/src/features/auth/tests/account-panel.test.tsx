import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import type { AuthenticatedUser, AuthSession } from "../api/auth.api";
import { AccountPanel } from "../components/account-panel";

const fixture = vi.hoisted(() => ({
  tab: null as string | null,
  user: null as AuthenticatedUser | null,
  isLoading: false,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => fixture.tab }),
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("../components/auth-provider", () => ({
  useAuth: () => ({ user: fixture.user, isLoading: fixture.isLoading }),
}));

beforeEach(() => {
  fixture.tab = null;
  fixture.isLoading = false;
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

function render(client = new QueryClient()) {
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <AccountPanel />
    </QueryClientProvider>,
  );
}

it.each([null, "info"])(
  "keeps profile and account metadata on the default account tab for tab %s",
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
    expect(html).toContain('href="/account/files"');
    expect(html).not.toContain("member-email-notice");
    expect(html).not.toContain('href="/account?tab=info"');
  },
);

it("keeps roles and permissions in the roles tab", () => {
  fixture.tab = "roles";
  const html = render();
  expect(html).toContain("Th\u00e0nh vi\u00ean");
  expect(html).toContain("profile:read:self");
  expect(html).toContain("profile:update:self");
  expect(html).toContain('aria-selected="true"');
  expect(html).toContain("Vai tr\u00f2 v\u00e0 quy\u1ec1n");
});

it.each(["MEMBER", "ADMIN", "SUPER_ADMIN"])(
  "offers the same four personal account tabs to %s, including legacy deep links",
  (role) => {
    fixture.user!.roles = [role];
    for (const [value, selected] of [
      [null, "info"],
      ["info", "info"],
      ["roles", "roles"],
      ["security", "security"],
      ["sessions", "sessions"],
      ["unknown", "info"],
    ]) {
      fixture.tab = value;
      const html = render();
      const tabs = [...html.matchAll(/<a([^>]*role="tab"[^>]*)>/g)];
      expect(tabs).toHaveLength(4);
      expect(
        tabs.filter((tab) => tab[1].includes('aria-selected="true"')),
      ).toHaveLength(1);
      expect(
        tabs.find((tab) => tab[1].includes('aria-selected="true"'))?.[1],
      ).toContain(`id="account-tab-${selected}"`);
      expect(html).toContain(
        `role="tabpanel" aria-labelledby="account-tab-${selected}"`,
      );
      expect(html.match(/<h1 /g)).toHaveLength(1);
    }
  },
);

it.each([0, 1, 3])(
  "renders %i sessions as empty state or table rows and mobile cards",
  (count) => {
    fixture.tab = "sessions";
    const client = new QueryClient();
    const sessions: AuthSession[] = Array.from(
      { length: count },
      (_, index) => ({
        id: `personal-session-${index}`,
        createdAt: "2026-10-07T07:00:00Z",
        expiresAt: "2026-10-14T07:00:00Z",
        current: index === 0,
      }),
    );
    client.setQueryData(["auth", "sessions", fixture.user!.id], sessions);
    const html = render(client);
    if (!count) {
      expect(html).toContain(
        "Kh\u00f4ng c\u00f3 phi\u00ean \u0111\u0103ng nh\u1eadp \u0111ang ho\u1ea1t \u0111\u1ed9ng.",
      );
      expect(html).not.toContain("<table");
      expect(html).not.toContain("data-revoke");
    } else {
      expect(html).toContain('<table class="member-table"');
      expect(html.match(/<th scope="col">/g)).toHaveLength(5);
      expect(html.match(/<tr>/g)).toHaveLength(count + 1);
      expect(html.match(/data-revoke=/g)).toHaveLength(count * 2);
      expect(html).toContain('class="member-mobile-list"');
    }
  },
);

it("never displays sessions cached under a different account", () => {
  fixture.tab = "sessions";
  const client = new QueryClient();
  client.setQueryData(
    ["auth", "sessions", "previous-account"],
    [
      {
        id: "previous-private-session",
        current: true,
        createdAt: "2026-10-07T07:00:00Z",
        expiresAt: "2026-10-14T07:00:00Z",
      },
    ],
  );
  const html = render(client);
  expect(html).not.toContain("previous-private-session");
  expect(html).toContain(
    "\u0110ang t\u1ea3i phi\u00ean \u0111\u0103ng nh\u1eadp",
  );
});

it("keeps restoration loading and guest feedback outside the account tabs", () => {
  fixture.isLoading = true;
  expect(render()).toContain("\u0110ang kh\u00f4i ph\u1ee5c phi\u00ean");
  expect(render()).not.toContain('role="tablist"');
  fixture.isLoading = false;
  fixture.user = null;
  expect(render()).toContain('href="/login"');
  expect(render()).not.toContain('role="tablist"');
});

it("offers one resend action and the existing password setup for an unverified account", () => {
  fixture.user!.emailVerifiedAt = null;
  fixture.user!.hasPassword = false;
  const html = render();
  expect(html.match(/G\u1eedi l\u1ea1i email/g)).toHaveLength(1);
  expect(html).toContain("Ch\u01b0a x\u00e1c minh");
  expect(html).not.toContain("G\u1eedi email x\u00e1c minh");
  fixture.tab = "security";
  expect(render()).toContain("\u0110\u1eb7t m\u1eadt kh\u1ea9u");
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
