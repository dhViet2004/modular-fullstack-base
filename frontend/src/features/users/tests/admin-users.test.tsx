import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/features/auth/api/auth.api";
import { AdminUsers } from "../components/admin-users";
import { AdminAuditLogs } from "@/features/audit/components/admin-audit-logs";
import { RoleDashboard } from "@/features/auth/components/role-dashboard";

const fixture = vi.hoisted(() => ({
  user: null as AuthenticatedUser | null,
  status: "authenticated",
  users: {
    data: [] as unknown[] | undefined,
    isPending: false,
    isError: false,
    error: null as unknown,
    isFetching: false,
    refetch: vi.fn(),
  },
  audit: {
    data: { pages: [{ auditLogs: [], nextCursor: null }] } as unknown,
    isPending: false,
    isError: false,
    error: null as unknown,
    isFetching: false,
    isFetchNextPageError: false,
    hasNextPage: false,
  },
  useUsers: vi.fn(),
  useAudit: vi.fn(),
}));
vi.mock("@/features/auth/components/auth-provider", () => ({
  useAuth: () => ({
    user: fixture.user,
    status: fixture.status,
    isLoading: fixture.status === "loading" && !fixture.user,
  }),
}));
vi.mock("../hooks/use-users", () => ({
  useUsers: (...args: unknown[]) => {
    fixture.useUsers(...args);
    return fixture.users;
  },
}));
vi.mock("@/features/audit/hooks/use-audit-logs", () => ({
  useAuditLogs: (...args: unknown[]) => {
    fixture.useAudit(...args);
    return fixture.audit;
  },
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

const listed = {
  id: "listed-user",
  email: "private@example.com",
  displayName: "Visible User",
  status: "ACTIVE" as const,
  emailVerifiedAt: null,
  createdAt: "2026-10-01T09:00:00Z",
  updatedAt: "2026-10-01T09:00:00Z",
  roles: ["MEMBER", "ADMIN"],
};
beforeEach(() => {
  fixture.user = {
    ...listed,
    id: "actor",
    permissions: ["users:read", "audit:read", "roles:manage"],
    hasPassword: true,
  };
  fixture.status = "authenticated";
  Object.assign(fixture.users, {
    data: [listed],
    isPending: false,
    isError: false,
    error: null,
  });
  Object.assign(fixture.audit, {
    data: { pages: [{ auditLogs: [], nextCursor: null }] },
    isPending: false,
    isError: false,
    error: null,
    isFetchNextPageError: false,
    hasNextPage: false,
  });
  vi.clearAllMocks();
});

describe("ADMIN presentation guards", () => {
  it("does not mount role actions for ADMIN even with roles:manage", () => {
    const html = renderToStaticMarkup(<AdminUsers />);
    expect(html).toContain("Visible User");
    expect(html).not.toContain("Cấp ADMIN");
    expect(html).not.toContain("Thu hồi ADMIN");
    expect(fixture.useUsers).toHaveBeenCalledWith("actor", true);
  });
  it.each([true, false])(
    "requires both SUPER_ADMIN and roles:manage (permission=%s)",
    (allowed) => {
      fixture.user!.roles = ["SUPER_ADMIN"];
      fixture.user!.permissions = allowed
        ? ["users:read", "roles:manage"]
        : ["users:read"];
      expect(
        renderToStaticMarkup(<AdminUsers />).includes("Thu hồi ADMIN"),
      ).toBe(allowed);
    },
  );
  it.each(["users", "audit"])(
    "does not mount protected %s content or queries without permission",
    (feature) => {
      fixture.user!.permissions = [];
      const html = renderToStaticMarkup(
        feature === "users" ? <AdminUsers /> : <AdminAuditLogs />,
      );
      expect(html).toContain("403");
      expect(html).not.toContain("private@example.com");
      expect(fixture.useUsers).not.toHaveBeenCalled();
      expect(fixture.useAudit).not.toHaveBeenCalled();
    },
  );
  it.each(["users", "audit"])(
    "shows guest without mounting the %s query",
    (feature) => {
      fixture.user = null;
      const html = renderToStaticMarkup(
        feature === "users" ? <AdminUsers /> : <AdminAuditLogs />,
      );
      expect(html).toContain("401");
      expect(fixture.useUsers).not.toHaveBeenCalled();
      expect(fixture.useAudit).not.toHaveBeenCalled();
    },
  );
  it("hides loaded user data during session verification", () => {
    fixture.status = "loading";
    const html = renderToStaticMarkup(<AdminUsers />);
    expect(html).toContain("Đang tải");
    expect(html).not.toContain("private@example.com");
    expect(fixture.useUsers).toHaveBeenCalledWith("actor", false);
  });
  it("hides cached users when the API returns 403", () => {
    Object.assign(fixture.users, {
      isError: true,
      error: { isAxiosError: true, response: { status: 403 } },
    });
    const html = renderToStaticMarkup(<AdminUsers />);
    expect(html).toContain("403");
    expect(html).not.toContain("private@example.com");
  });
  it("keeps cached users and offers retry after a temporary load failure", () => {
    Object.assign(fixture.users, {
      isError: true,
      error: { isAxiosError: true, response: { status: 503 } },
    });
    const html = renderToStaticMarkup(<AdminUsers />);
    expect(html).toContain("private@example.com");
    expect(html).toContain("Thử lại");
    expect(html).not.toContain("401");
  });
  it("distinguishes an empty dataset from an empty search", () => {
    fixture.users.data = [];
    const html = renderToStaticMarkup(<AdminUsers />);
    expect(html).toContain("Chưa có người dùng");
    expect(html).not.toContain("Không tìm thấy người dùng");
  });
  it("keeps the SUPER_ADMIN child guard intact", () => {
    fixture.user!.roles = ["ADMIN"];
    expect(
      renderToStaticMarkup(
        <RoleDashboard role="SUPER_ADMIN">
          <span>protected-setting</span>
        </RoleDashboard>,
      ),
    ).not.toContain("protected-setting");
    fixture.user!.roles = ["SUPER_ADMIN"];
    expect(
      renderToStaticMarkup(
        <RoleDashboard role="SUPER_ADMIN">
          <span>protected-setting</span>
        </RoleDashboard>,
      ),
    ).toContain("protected-setting");
  });
  it("only mounts dashboard cards permitted by current navigation", () => {
    fixture.user!.permissions = [];
    const html = renderToStaticMarkup(<RoleDashboard role="ADMIN" />);
    expect(html).toContain("Tổng quan quản trị");
    expect(html).toContain('href="/account/files"');
    expect(html).not.toContain('href="/admin/users"');
    expect(html).not.toContain('href="/admin/audit-logs"');
  });
  const auditRecord = {
    id: "audit-id",
    action: "PRIVATE_AUDIT_ROW",
    outcome: "SUCCESS",
    actorUserId: null,
    subjectType: null,
    subjectId: null,
    sessionId: null,
    ipAddress: null,
    userAgent: null,
    metadata: null,
    createdAt: "2026-10-09T09:00:00Z",
  };
  it("hides cached audit data during session verification", () => {
    fixture.status = "loading";
    fixture.audit.data = {
      pages: [{ auditLogs: [auditRecord], nextCursor: "next" }],
    };
    const html = renderToStaticMarkup(<AdminAuditLogs />);
    expect(html).not.toContain("PRIVATE_AUDIT_ROW");
    expect(fixture.useAudit).toHaveBeenCalledWith(
      "actor",
      { limit: 50 },
      false,
    );
  });
  it("hides cached audit data after API 403", () => {
    Object.assign(fixture.audit, {
      data: { pages: [{ auditLogs: [auditRecord], nextCursor: "next" }] },
      isError: true,
      error: { isAxiosError: true, response: { status: 403 } },
    });
    const html = renderToStaticMarkup(<AdminAuditLogs />);
    expect(html).toContain("403");
    expect(html).not.toContain("PRIVATE_AUDIT_ROW");
  });
  it("retains audit pages and offers the same next-page retry after 503", () => {
    Object.assign(fixture.audit, {
      data: { pages: [{ auditLogs: [auditRecord], nextCursor: "next" }] },
      isError: true,
      isFetchNextPageError: true,
      hasNextPage: true,
    });
    const html = renderToStaticMarkup(<AdminAuditLogs />);
    expect(html).toContain("PRIVATE_AUDIT_ROW");
    expect(html).toContain("Thử tải thêm");
    expect(html).not.toContain("Không thể tải nhật ký hệ thống.");
  });
});
