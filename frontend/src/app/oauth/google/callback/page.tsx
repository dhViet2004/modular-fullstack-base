import { GoogleOAuthCallback } from "@/features/auth/components/google-oauth-callback";

export default function GoogleOAuthCallbackPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-16">
      <section className="w-full max-w-lg border border-[var(--ink)] bg-[var(--paper)] p-8 shadow-[10px_10px_0_var(--acid)]">
        <p className="font-mono text-xs font-semibold tracking-[0.12em]">
          GOOGLE OAUTH
        </p>
        <h1 className="mt-2 text-5xl tracking-[-0.05em]">Đăng nhập</h1>
        <div className="mt-6">
          <GoogleOAuthCallback />
        </div>
      </section>
    </main>
  );
}
