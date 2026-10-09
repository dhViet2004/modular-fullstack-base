import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../api/auth.api";
import { registerSchema } from "../schemas/register.schema";
import { VerifyEmailPanel } from "../components/verify-email-panel";
import { GoogleOAuthCallback } from "../components/google-oauth-callback";
import { SessionRecovery } from "../components/session-recovery";
import { EmailVerificationNotice } from "../components/email-verification-notice";
import { RegisterForm } from "../components/register-form";
import { AuthNavigation } from "../components/auth-navigation";

const fixture = vi.hoisted(() => ({
  token: "verification-token" as string | null,
  status: "guest",
  user: null as AuthenticatedUser | null,
  verify: {
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null as unknown,
    mutate: vi.fn(),
  },
  resend: {
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null as unknown,
    mutate: vi.fn(),
  },
  register: {
    isPending: false,
    isSuccess: false,
    data: {},
    mutateAsync: vi.fn(),
  },
  retrySession: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => fixture.token }),
  usePathname: () => "/account",
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("../components/auth-provider", () => ({
  useAuth: () => ({
    user: fixture.user,
    status: fixture.status,
    isLoading: fixture.status === "loading",
    retrySession: fixture.retrySession,
  }),
}));
vi.mock("../hooks/use-verify-email", () => ({
  useVerifyEmail: () => fixture.verify,
}));
vi.mock("../hooks/use-request-email-verification", () => ({
  useRequestEmailVerification: () => fixture.resend,
}));
vi.mock("../hooks/use-register", () => ({
  useRegister: () => fixture.register,
}));
vi.mock("../components/logout-button", () => ({
  LogoutButton: () => <button>Logout</button>,
}));

beforeEach(() => {
  fixture.token = "verification-token";
  fixture.status = "guest";
  fixture.user = null;
  Object.assign(fixture.verify, {
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  });
  Object.assign(fixture.resend, {
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  });
  Object.assign(fixture.register, { isPending: false, isSuccess: false });
  vi.clearAllMocks();
});

describe("register confirmation", () => {
  const valid = {
    email: "new@example.com",
    password: "exact-password",
    confirmPassword: "exact-password",
    displayName: "",
  };
  it("accepts matching passwords without trimming either value", () => {
    expect(registerSchema.parse(valid).confirmPassword).toBe(valid.password);
    const mismatch = registerSchema.safeParse({
      ...valid,
      confirmPassword: ` ${valid.password}`,
    });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success)
      expect(mismatch.error.issues[0].path).toEqual(["confirmPassword"]);
  });
  it("requires password confirmation", () => {
    expect(
      registerSchema.safeParse({ ...valid, confirmPassword: "" }).success,
    ).toBe(false);
  });
  it("offers login after registration without implying the user is authenticated", () => {
    fixture.register.isSuccess = true;
    const html = renderToStaticMarkup(<RegisterForm />);
    expect(html).toContain("Tạo tài khoản thành công");
    expect(html).toContain('href="/login"');
    expect(html).not.toContain("next step");
  });
});

describe("manual email verification", () => {
  it("offers explicit verification before consuming the token", () => {
    const html = renderToStaticMarkup(<VerifyEmailPanel />);
    expect(html).toContain("Xác nhận để hoàn tất");
    expect(html).toContain("Xác minh email</button>");
    expect(fixture.verify.mutate).not.toHaveBeenCalled();
  });
  it("announces pending verification without offering another submit", () => {
    fixture.verify.isPending = true;
    const html = renderToStaticMarkup(<VerifyEmailPanel />);
    expect(html).toContain("Đang xác minh email");
    expect(html).toContain('role="status"');
    expect(html).not.toContain("<button");
  });
  it("sends a verified guest to login rather than implying token verification signs them in", () => {
    fixture.verify.isSuccess = true;
    const html = renderToStaticMarkup(<VerifyEmailPanel />);
    expect(html).toContain("Email đã được xác minh");
    expect(html).toContain('href="/login"');
  });
  it("keeps a temporary verification failure retryable rather than declaring an invalid token", () => {
    Object.assign(fixture.verify, {
      isError: true,
      error: { isAxiosError: true, response: { status: 503 } },
    });
    const html = renderToStaticMarkup(<VerifyEmailPanel />);
    expect(html).toContain("Không thể xác minh email");
    expect(html).toContain("Thử lại");
    expect(html).not.toContain("Liên kết không hợp lệ");
  });
  it("shows confirmed invalid tokens separately", () => {
    Object.assign(fixture.verify, {
      isError: true,
      error: {
        isAxiosError: true,
        response: {
          status: 400,
          data: { error: { code: "INVALID_EMAIL_VERIFICATION_TOKEN" } },
        },
      },
    });
    const html = renderToStaticMarkup(<VerifyEmailPanel />);
    expect(html).toContain("Liên kết không hợp lệ hoặc hết hạn");
    expect(html).not.toContain("Xác minh email</button>");
  });
  it("does not guess a resend deadline after the server rate limits", () => {
    fixture.user = {
      email: "user@example.com",
      emailVerifiedAt: null,
    } as AuthenticatedUser;
    Object.assign(fixture.resend, {
      isError: true,
      error: {
        isAxiosError: true,
        response: {
          status: 429,
          data: { error: { code: "EMAIL_VERIFICATION_RATE_LIMITED" } },
        },
      },
    });
    const html = renderToStaticMarkup(<EmailVerificationNotice />);
    expect(html).toContain("Vui lòng chờ trước khi gửi lại");
    expect(html).toContain("Thời gian chờ do máy chủ quản lý");
    expect(html).not.toMatch(/45|disabled/);
  });
});

describe("OAuth and session recovery presentation", () => {
  it.each(["loading", "authenticated", "guest", "restore-error"])(
    "renders the actual OAuth session state: %s",
    (status) => {
      fixture.status = status;
      if (status === "authenticated")
        fixture.user = { roles: ["MEMBER"] } as AuthenticatedUser;
      const html = renderToStaticMarkup(<GoogleOAuthCallback />);
      expect(html).toContain(
        status === "loading"
          ? "Đang hoàn tất đăng nhập"
          : status === "authenticated"
            ? "Đăng nhập thành công"
            : "Không thể đăng nhập bằng Google",
      );
      if (status === "restore-error")
        expect(html).toContain("Thử khôi phục lại");
    },
  );
  it("distinguishes session expiration from restoration errors", () => {
    fixture.status = "expired";
    expect(renderToStaticMarkup(<SessionRecovery />)).toContain(
      "Phiên đăng nhập đã hết hạn",
    );
    fixture.status = "restore-error";
    const html = renderToStaticMarkup(<SessionRecovery />);
    expect(html).toContain("Không thể khôi phục phiên");
    expect(html).not.toContain("Phiên đăng nhập đã hết hạn");
  });
  it("keeps the main content target and public auth geometry when expiration replaces the protected page", () => {
    fixture.status = "expired";
    const html = renderToStaticMarkup(
      <AuthNavigation>
        <p>Protected content</p>
      </AuthNavigation>,
    );
    expect(html).toContain(
      'class="app-content" id="main-content" tabindex="-1"',
    );
    expect(html).toContain("Phiên đăng nhập đã hết hạn");
    expect(html).not.toContain("Protected content");
  });
  it("retains the authenticated shell and mounted content during temporary restoration errors", () => {
    fixture.status = "restore-error";
    fixture.user = {
      id: "user",
      email: "user@example.com",
      roles: ["MEMBER"],
      permissions: [],
    } as unknown as AuthenticatedUser;
    const html = renderToStaticMarkup(
      <AuthNavigation>
        <p>Unsaved content</p>
      </AuthNavigation>,
    );
    expect(html).toContain("role-app-shell");
    expect(html).toContain("Unsaved content");
    expect(html).toContain("Thử khôi phục lại");
  });
});
