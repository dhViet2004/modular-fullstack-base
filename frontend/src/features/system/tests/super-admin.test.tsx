import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
} from "../../../../../backend/src/modules/access/permission.catalog";
import { queryKeys } from "@/lib/query/query-keys";

const fixture = vi.hoisted(() => ({
  auth: {
    user: {
      id: "account-a",
      roles: ["SUPER_ADMIN"],
      permissions: ["users:read", "audit:read"],
    },
    status: "authenticated",
  },
  tab: null as string | null,
  query: {
    data: true as boolean | undefined,
    isPending: false,
    isFetching: false,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  get: vi.fn(),
  patch: vi.fn(),
  useQuery: vi.fn(),
}));
vi.mock("@/features/auth/components/auth-provider", () => ({
  useAuth: () => fixture.auth,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => fixture.tab }),
}));
vi.mock("@/lib/axios/client", () => ({
  apiClient: { get: fixture.get, patch: fixture.patch },
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => {
    fixture.useQuery(options);
    return fixture.query;
  },
  useQueryClient: () => ({}),
  useMutation: () => ({ isPending: false }),
}));
import { SuperAdminWorkspace } from "../components/super-admin-workspace";
import { EmailVerificationSetting } from "../components/email-verification-setting";
import {
  getEmailVerificationSetting,
  setEmailVerificationSetting,
} from "../api/system.api";

beforeEach(() => {
  vi.clearAllMocks();
  fixture.auth = {
    user: {
      id: "account-a",
      roles: ["SUPER_ADMIN"],
      permissions: ["users:read", "audit:read"],
    },
    status: "authenticated",
  };
  fixture.tab = null;
  fixture.query = {
    data: true,
    isPending: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
});

it.each(["MEMBER", "ADMIN"])(
  "does not mount SUPER_ADMIN reads or switches for %s",
  (role) => {
    fixture.auth.user.roles = [role];
    expect(renderToStaticMarkup(<SuperAdminWorkspace />)).toBe("");
    expect(renderToStaticMarkup(<EmailVerificationSetting />)).toBe("");
    expect(fixture.useQuery).not.toHaveBeenCalled();
  },
);

it.each([true, false])(
  "renders the verified email setting %s and reads with account isolation and cancellation",
  (enabled) => {
    fixture.query.data = enabled;
    const html = renderToStaticMarkup(<EmailVerificationSetting />);
    expect(html).toContain('role="switch"');
    expect(html).toContain(enabled ? "Đang bật" : "Đang tắt");
    expect(html.includes('checked=""')).toBe(enabled);
    expect(fixture.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.system.emailVerification("account-a"),
        enabled: true,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      }),
    );
  },
);

it("hides known settings and disables the read while session is being verified", () => {
  fixture.auth.status = "loading";
  const html = renderToStaticMarkup(<EmailVerificationSetting />);
  expect(html).toContain("Đang xác minh phiên");
  expect(html).not.toContain('role="switch"');
  expect(fixture.useQuery).toHaveBeenCalledWith(
    expect.objectContaining({ enabled: false }),
  );
});

it("keeps a restore-error separate from forbidden and blocks writes", () => {
  fixture.auth.status = "restore-error";
  const html = renderToStaticMarkup(<EmailVerificationSetting />);
  expect(html).not.toMatch(/403|role="switch"/);
  expect(fixture.useQuery).toHaveBeenCalledWith(
    expect.objectContaining({ enabled: false }),
  );
});

it.each(["loading", "read-error", "forbidden"])(
  "renders %s without mounting a writable switch",
  (state) => {
    fixture.query.data = undefined;
    if (state === "loading") fixture.query.isPending = true;
    else {
      fixture.query.isError = true;
      fixture.query.error = {
        _isAxiosError: true,
        isAxiosError: true,
        response: { status: state === "forbidden" ? 403 : 503 },
      };
    }
    const html = renderToStaticMarkup(<EmailVerificationSetting />);
    expect(html).not.toContain('role="switch"');
    expect(html).toContain(
      state === "loading"
        ? "Đang tải cấu hình"
        : state === "forbidden"
          ? "403"
          : "Thử tải lại",
    );
  },
);

it("keeps a cached value read-only after a failed re-read", () => {
  fixture.query.isError = true;
  const html = renderToStaticMarkup(<EmailVerificationSetting />);
  expect(html).toMatch(/disabled=""[^>]*role="switch"/);
  expect(html).toContain("Giá trị cuối đã xác minh");
  expect(html).toContain("Thử tải lại");
});

it("uses exactly the verified default backend catalog as a static read-only reference", () => {
  fixture.tab = "rbac";
  const html = renderToStaticMarkup(<SuperAdminWorkspace />);
  const rows = [
    ...html.matchAll(
      /<tr><th scope="row">([^<]+)<\/th><td>([^<]+)<\/td><td>([^<]+)<\/td><td>([^<]+)<\/td><\/tr>/g,
    ),
  ];
  expect(rows.map((row) => row[1])).toEqual(Object.values(PERMISSIONS));
  for (const row of rows) {
    ["MEMBER", "ADMIN", "SUPER_ADMIN"].forEach((role, index) => {
      const permissions = ROLE_PERMISSIONS[
        role as keyof typeof ROLE_PERMISSIONS
      ] as readonly string[];
      expect(row[index + 2]).toBe(
        permissions.includes(row[1]) ? "Có" : "Không",
      );
    });
  }
  expect(html).toContain("không phải dữ liệu permission runtime trong DB");
  expect(html).toContain(
    "cấp/gỡ ADMIN cần đồng thời SUPER_ADMIN và roles:manage",
  );
  expect(html).not.toMatch(/<button|<input|<select/);
  expect(fixture.useQuery).not.toHaveBeenCalled();
});

it("unknown query tabs fall back to Dashboard and cards obey current list/audit permissions", () => {
  fixture.tab = "unknown";
  fixture.auth.user.permissions = [];
  const html = renderToStaticMarkup(<SuperAdminWorkspace />);
  expect(html).toContain("Tổng quan siêu quản trị");
  expect(html).not.toMatch(/href="\/admin\/(users|audit-logs)"/);
  expect(html).toContain('href="/super-admin?tab=email-verification"');
});

it.each([true, false])(
  "preserves GET/PATCH boolean setting contract %s with AbortSignal and actual returned value",
  async (enabled) => {
    const signal = new AbortController().signal;
    fixture.get.mockResolvedValue({ data: { data: { enabled } } });
    fixture.patch.mockResolvedValue({ data: { data: { enabled: !enabled } } });
    expect(await getEmailVerificationSetting(signal)).toBe(enabled);
    expect(await setEmailVerificationSetting(enabled, signal)).toBe(!enabled);
    expect(fixture.get).toHaveBeenCalledWith("/system/email-verification", {
      signal,
    });
    expect(fixture.patch).toHaveBeenCalledWith(
      "/system/email-verification",
      { enabled },
      { signal },
    );
  },
);
