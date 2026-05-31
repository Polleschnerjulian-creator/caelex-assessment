"use client";

export interface MiniStat {
  label: string;
  value: string;
  accent?: "default" | "success";
}

export function MiniStatsStrip({ stats }: { stats: MiniStat[] }) {
  return (
    <div className="flex gap-2" data-testid="mini-stats">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex-1 rounded-lg border border-trade-border-subtle bg-trade-bg-panel px-3 py-2.5 text-center"
        >
          <div
            className={`text-lg font-semibold ${s.accent === "success" ? "text-green-500" : "text-trade-text-primary"}`}
          >
            {s.value}
          </div>
          <div className="text-[10px] text-trade-text-muted">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
