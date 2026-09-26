import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/login-form";
import { GoogleLoginButton } from "@/features/auth/components/google-login-button";

export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-6 pb-12 pt-24 max-sm:place-items-start max-sm:justify-items-center max-sm:pt-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_85%)]"
        aria-hidden="true"
      />

      <header className="absolute top-7 left-[clamp(24px,6vw,88px)] z-10">
        <Link
          className="flex items-center gap-3 font-mono text-xs font-semibold tracking-[0.12em] text-[var(--ink)] no-underline"
          href="/register"
        >
          <span className="grid size-[38px] place-items-center bg-[var(--ink)] text-[var(--paper)]">
            CS
          </span>
          <span>CORESTACK</span>
        </Link>
      </header>

      <section className="relative z-10 w-full max-w-[460px] border border-[var(--ink)] bg-[rgba(241,239,229,0.96)] p-[clamp(24px,5vw,42px)] shadow-[12px_12px_0_var(--acid)] max-sm:shadow-[7px_7px_0_var(--acid)]">
        <div className="mb-8">
          <p className="font-mono text-xs font-semibold tracking-[0.14em]">
            WELCOME BACK
          </p>
          <h1 className="mt-2 mb-0 text-[clamp(2.6rem,8vw,4.4rem)] leading-[0.95] tracking-[-0.06em]">
            Login
          </h1>
        </div>

        <LoginForm />
        <Suspense fallback={null}>
          <GoogleLoginButton />
        </Suspense>

        <p className="mt-6 mb-0 text-center text-sm">
          No account?{" "}
          <Link
            className="font-semibold text-[var(--ink)] underline decoration-[var(--signal)] decoration-2 underline-offset-4"
            href="/register"
          >
            Register
          </Link>
        </p>
      </section>
    </main>
  );
}
