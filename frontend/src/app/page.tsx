import { HealthCard } from "@/features/system/components/health-card";

export default function Home() {
  return (
    <main className="shell">
      <nav>
        <span className="brand-mark">CS</span>
        <span>CORESTACK / BASELINE 01</span>
      </nav>
      <div className="grid-lines" aria-hidden="true" />
      <section className="hero">
        <p className="kicker">MODULAR FULLSTACK FOUNDATION</p>
        <h1>
          Build the product.
          <br />
          Keep the foundations sharp.
        </h1>
        <p className="lede">
          Next.js, Express and PostgreSQL arranged as two deployable apps with
          one clear contract.
        </p>
        <div className="stack-list">
          <span>Next.js 15</span>
          <span>Express 5</span>
          <span>Prisma</span>
          <span>PostgreSQL 16</span>
        </div>
      </section>
      <aside>
        <HealthCard />
        <div className="note-card">
          <p className="eyebrow">NEXT MILESTONE</p>
          <strong>Identity &amp; authorization</strong>
          <p>Server-side policy first, UI permissions second.</p>
        </div>
      </aside>
    </main>
  );
}
