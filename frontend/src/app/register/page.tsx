import Link from "next/link";
import { Card } from "@/components/ui/card";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-6 pb-12 pt-24 max-sm:place-items-start max-sm:justify-items-center max-sm:pt-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_85%)]"
        aria-hidden="true"
      />

      <header className="absolute top-7 left-[clamp(24px,6vw,88px)] z-10">
        <Link
          className="flex items-center gap-3 font-mono text-xs font-semibold tracking-[0.12em] text-[var(--ink)] no-underline"
          href="/"
        >
          <span className="grid size-[38px] place-items-center bg-[var(--ink)] text-[var(--paper)]">
            CS
          </span>
          <span>CORESTACK</span>
        </Link>
      </header>

      <Card className="relative z-10 w-full max-w-[460px]">
        <div className="mb-8">
          <p className="font-mono text-xs font-semibold tracking-[0.14em]">
            NEW ACCOUNT
          </p>
          <h1 className="mt-2 mb-0 text-[clamp(2.6rem,8vw,4.4rem)] leading-[0.95] tracking-[-0.06em]">
            Register
          </h1>
        </div>

        <RegisterForm />
        <p className="mt-6 mb-0 text-center text-sm">
          Already registered?{" "}
          <Link
            className="font-semibold text-[var(--ink)] underline decoration-[var(--signal)] decoration-2 underline-offset-4"
            href="/login"
          >
            Login
          </Link>
        </p>
      </Card>
    </main>
  );
}
