"use client";

import { useApiHealth } from "../hooks/use-api-health";

export function HealthCard() {
  const health = useApiHealth();
  const connected = health.data?.status === "ok";
  return (
    <section className="status-card" aria-live="polite">
      <span className={`status-dot ${connected ? "is-online" : ""}`} />
      <div>
        <p className="eyebrow">API CONNECTION</p>
        <strong>
          {health.isPending
            ? "Checking..."
            : connected
              ? "Operational"
              : "Offline"}
        </strong>
      </div>
      <span className="status-code">{connected ? "200" : "--"}</span>
    </section>
  );
}
