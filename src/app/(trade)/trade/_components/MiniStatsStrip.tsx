"use client";

export interface MiniStat {
  label: string;
  value: string;
  accent?: "default" | "success";
}

/**
 * MiniStatsStrip — Neon-console style metric card: a single white card with a
 * row of metrics divided by hairlines (label on top, large value below).
 */
export function MiniStatsStrip({ stats }: { stats: MiniStat[] }) {
  return (
    <div
      data-testid="mini-stats"
      className="overflow-hidden rounded-xl border border-trade-border bg-trade-bg-panel shadow-[var(--trade-shadow-card)]"
    >
      <div className="grid grid-cols-2 divide-x divide-trade-border-subtle sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="px-5 py-4">
            <div className="text-[12px] text-trade-text-muted">{s.label}</div>
            <div
              className="mt-1.5 text-[24px] font-bold tracking-[-0.02em] text-trade-text-primary"
              style={
                s.accent === "success"
                  ? { color: "var(--trade-accent-success)" }
                  : undefined
              }
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
