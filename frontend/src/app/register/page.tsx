import Link from "next/link";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <main className="auth-shell">
      <div className="auth-grid" aria-hidden="true" />

      <header className="auth-nav">
        <Link className="auth-brand" href="/">
          <span className="brand-mark">CS</span>
          <span>CORESTACK</span>
        </Link>
      </header>

      <section className="auth-panel">
        <div className="auth-panel-heading">
          <p className="eyebrow">NEW ACCOUNT</p>
          <h1>Register</h1>
        </div>

        <RegisterForm />
      </section>
    </main>
  );
}
