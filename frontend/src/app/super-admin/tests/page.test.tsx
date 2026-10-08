import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/features/auth/api/auth.api";
import SuperAdminPage from "../page";

const auth = vi.hoisted(() => ({
  isLoading: false,
  user: null as Pick<
    AuthenticatedUser,
    "roles" | "permissions" | "displayName" | "email"
  > | null,
}));
const setting = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/components/auth-provider", () => ({
  useAuth: () => auth,
}));
vi.mock("@/features/system/components/email-verification-setting", () => ({
  EmailVerificationSetting: () => {
    setting();
    return <section>Protected email setting</section>;
  },
}));

describe("super-admin route guard", () => {
  beforeEach(() => {
    setting.mockClear();
    auth.isLoading = false;
    auth.user = {
      roles: ["SUPER_ADMIN"],
      permissions: [],
      displayName: "Test User",
      email: "test@example.com",
    };
  });

  it.each([false, true])(
    "does not mount protected content while loading (user present: %s)",
    (hasUser) => {
      auth.isLoading = true;
      if (!hasUser) auth.user = null;
      const html = renderToStaticMarkup(<SuperAdminPage />);
      expect(html).toContain('role="status"');
      expect(html).not.toMatch(/401|403|Protected email setting/);
      expect(setting).not.toHaveBeenCalled();
    },
  );

  it("shows 401 and the login link without mounting protected content for guests", () => {
    auth.user = null;
    const html = renderToStaticMarkup(<SuperAdminPage />);
    expect(html).toContain("401");
    expect(html).toContain('role="alert"');
    expect(html).toContain('href="/login"');
    expect(html).not.toContain("403");
    expect(setting).not.toHaveBeenCalled();
  });

  it.each(["MEMBER", "ADMIN"])(
    "shows 403 without mounting protected content for %s",
    (role) => {
      auth.user!.roles = [role];
      auth.user!.permissions = ["users:read", "audit:read", "roles:manage"];
      const html = renderToStaticMarkup(<SuperAdminPage />);
      expect(html).toContain("403");
      expect(html).toContain('role="alert"');
      expect(html).not.toMatch(/401|Protected email setting/);
      expect(setting).not.toHaveBeenCalled();
    },
  );

  it.each([["SUPER_ADMIN"], ["MEMBER", "ADMIN", "SUPER_ADMIN"]])(
    "mounts protected content for verified roles %j",
    (...roles) => {
      auth.user!.roles = roles;
      const html = renderToStaticMarkup(<SuperAdminPage />);
      expect(html).toContain("Protected email setting");
      expect(html).not.toMatch(/401|403/);
      expect(setting).toHaveBeenCalledOnce();
    },
  );
});
