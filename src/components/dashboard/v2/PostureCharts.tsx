"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type {
  PostureSnapshot,
  RegulationStats,
} from "@/lib/comply-v2/posture.server";
import {
  REGULATION_LABELS,
  type ComplianceStatus,
} from "@/lib/comply-v2/types";

/**
 * Compliance posture charts — Recharts wrappers for the executive
 * summary at /dashboard/posture.
 *
 * Two charts:
 *   - StatusDonut: status distribution as a donut chart
 *   - RegulationBars: per-regulation attestation score
 *
 * Both are Client Components because Recharts depends on browser
 * resize/measure APIs. The Server-side page assembles the data and
 * passes plain JSON.
 */

// Palantir-tuned chart palette — slightly shifted from raw Tailwind
// so the colors read clean against the deep navy canvas. Saturation
// trimmed on the bright accents (amber/red) so they don't burn out.
const STATUS_COLORS: Record<ComplianceStatus, string> = {
  ATTESTED: "#34d399", // emerald-400 — brighter on dark
  UNDER_REVIEW: "#a78bfa", // violet-400
  DRAFT: "#60a5fa", // blue-400
  EVIDENCE_REQUIRED: "#fbbf24", // amber-400
  PENDING: "#64748b", // slate-500 — subdued
  EXPIRED: "#f87171", // red-400 — softer than 500 for dark bg
  NOT_APPLICABLE: "#475569", // slate-600
};

// Palantir tooltip — backdrop-blurred near-black with thin ring,
// monospace small caps for the values. Recharts inlines styles so we
// pass them via contentStyle.
const TOOLTIP_STYLE = {
  backgroundColor: "rgba(10, 14, 26, 0.95)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 4,
  color: "#e2e8f0",
  fontSize: 11,
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.7)",
} as const;

const STATUS_LABELS: Record<ComplianceStatus, string> = {
  ATTESTED: "Attested",
  UNDER_REVIEW: "Under review",
  DRAFT: "Draft",
  EVIDENCE_REQUIRED: "Evidence req.",
  PENDING: "Pending",
  EXPIRED: "Expired",
  NOT_APPLICABLE: "N/A",
};

const STATUS_ORDER: ComplianceStatus[] = [
  "ATTESTED",
  "UNDER_REVIEW",
  "DRAFT",
  "EVIDENCE_REQUIRED",
  "PENDING",
  "EXPIRED",
  "NOT_APPLICABLE",
];

export function StatusDonut({
  statusCounts,
}: {
  statusCounts: PostureSnapshot["statusCounts"];
}) {
  const data = STATUS_ORDER.map((status) => ({
    name: STATUS_LABELS[status],
    value: statusCounts[status],
    fill: STATUS_COLORS[status],
  })).filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
        {"// no items yet — start an assessment to populate"}
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={62}
          outerRadius={92}
          paddingAngle={2}
          stroke="rgba(10, 14, 26, 0.6)"
          strokeWidth={1}
        >
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: "transparent" }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="square"
          iconSize={8}
          formatter={(value: string) => (
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RegulationBars({
  breakdown,
}: {
  breakdown: RegulationStats[];
}) {
  if (breakdown.length === 0) {
    return (
      <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
        {"// no regulatory items yet"}
      </p>
    );
  }

  const data = breakdown.map((r) => ({
    name: shortenRegulation(r.regulation),
    score: r.score,
    total: r.total,
    attested: r.attested,
    evidenceRequired: r.evidenceRequired,
    pending: r.pending,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 24, left: 0 }}
        barSize={24}
      >
        <XAxis
          dataKey="name"
          tick={{
            fontSize: 9,
            fill: "#64748b",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }}
          interval={0}
          angle={-25}
          textAnchor="end"
          height={60}
          stroke="rgba(255, 255, 255, 0.06)"
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          unit="%"
          tick={{
            fontSize: 9,
            fill: "#64748b",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }}
          stroke="rgba(255, 255, 255, 0.06)"
          tickLine={false}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: "rgba(16, 185, 129, 0.06)" }}
        />
        <Bar dataKey="score" fill="#34d399" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function shortenRegulation(reg: keyof typeof REGULATION_LABELS): string {
  // X-axis labels — short forms so they fit at tilt.
  const SHORT: Record<string, string> = {
    DEBRIS: "Debris",
    CYBERSECURITY: "Cyber",
    NIS2: "NIS2",
    CRA: "CRA",
    UK_SPACE_ACT: "UK Space",
    US_REGULATORY: "US Reg.",
    EXPORT_CONTROL: "Export",
    SPECTRUM: "Spectrum",
  };
  return SHORT[reg] ?? reg;
}
