"use client";

// ─── Industry Benchmark Bar ─────────────────────────────────────────────────
// Shows where the operator's carbon intensity sits relative to industry data.

const BENCHMARKS: Record<
  string,
  { best: number; average: number; poor: number; label: string }
> = {
  LEO: { best: 200, average: 450, poor: 800, label: "LEO Missions" },
  MEO: { best: 300, average: 600, poor: 1000, label: "MEO Missions" },
  GEO: { best: 400, average: 900, poor: 1500, label: "GEO Missions" },
  HEO: { best: 400, average: 900, poor: 1500, label: "HEO Missions" },
  cislunar: { best: 500, average: 1200, poor: 2000, label: "Cislunar" },
  deep_space: {
    best: 600,
    average: 1500,
    poor: 2500,
    label: "Deep Space",
  },
};

interface Props {
  carbonIntensity: number;
  orbitType: string;
}

export default function IndustryBenchmark({
  carbonIntensity,
  orbitType,
}: Props) {
  const bench = BENCHMARKS[orbitType] ?? BENCHMARKS.LEO;
  const maxScale = bench.poor * 1.3;
  const position = Math.min(100, (carbonIntensity / maxScale) * 100);
  const bestPos = (bench.best / maxScale) * 100;
  const avgPos = (bench.average / maxScale) * 100;
  const poorPos = (bench.poor / maxScale) * 100;

  const isAboveAvg = carbonIntensity > bench.average;
  const isBelowBest = carbonIntensity <= bench.best;

  return (
    <div className="mt-5 pt-5 border-t border-[var(--border-default)]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-small font-medium text-[var(--text-secondary)]">
          Industry Benchmark — {bench.label}
        </p>
        <p className="text-small text-[var(--text-tertiary)]">
          {isBelowBest
            ? "Best in class"
            : isAboveAvg
              ? `${((carbonIntensity / bench.average - 1) * 100).toFixed(0)}% above average`
              : `${((1 - carbonIntensity / bench.average) * 100).toFixed(0)}% below average`}
        </p>
      </div>

      {/* Bar */}
      <div className="relative h-3 rounded-full overflow-hidden bg-[var(--surface-sunken)]">
        {/* Gradient fill */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, #10B981 0%, #10B981 20%, #F59E0B 50%, #EF4444 80%, #991B1B 100%)",
            opacity: 0.25,
          }}
        />

        {/* Best marker */}
        <div
          className="absolute top-0 bottom-0 w-px bg-emerald-500/60"
          style={{ left: `${bestPos}%` }}
        />
        {/* Average marker */}
        <div
          className="absolute top-0 bottom-0 w-px bg-amber-500/60"
          style={{ left: `${avgPos}%` }}
        />
        {/* Poor marker */}
        <div
          className="absolute top-0 bottom-0 w-px bg-red-500/60"
          style={{ left: `${poorPos}%` }}
        />

        {/* Your position */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md"
          style={{
            left: `calc(${position}% - 8px)`,
            background: isBelowBest
              ? "#10B981"
              : isAboveAvg
                ? "#EF4444"
                : "#F59E0B",
            boxShadow: `0 0 8px ${isBelowBest ? "rgba(16,185,129,0.4)" : isAboveAvg ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.4)"}`,
          }}
        />
      </div>

      {/* Labels */}
      <div className="relative mt-1.5 h-4">
        <span
          className="absolute text-[10px] text-emerald-500 -translate-x-1/2"
          style={{ left: `${bestPos}%` }}
        >
          Best ({bench.best})
        </span>
        <span
          className="absolute text-[10px] text-amber-500 -translate-x-1/2"
          style={{ left: `${avgPos}%` }}
        >
          Avg ({bench.average})
        </span>
        <span
          className="absolute text-[10px] text-red-500 -translate-x-1/2"
          style={{ left: `${poorPos}%` }}
        >
          Poor ({bench.poor})
        </span>
      </div>
    </div>
  );
}
