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

const STATUS_COLORS: Record<ComplianceStatus, string> = {
  ATTESTED: "#10b981", // emerald-500
  UNDER_REVIEW: "#8b5cf6", // violet-500
  DRAFT: "#3b82f6", // blue-500
  EVIDENCE_REQUIRED: "#f59e0b", // amber-500
  PENDING: "#94a3b8", // slate-400
  EXPIRED: "#ef4444", // red-500
  NOT_APPLICABLE: "#cbd5e1", // slate-300
};

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
      <p className="text-sm text-slate-400 dark:text-slate-500">
        No items yet — once you start an assessment, the distribution renders
        here.
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
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(15, 23, 42, 0.92)",
            border: "none",
            borderRadius: 8,
            color: "#f8fafc",
            fontSize: 12,
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          iconSize={8}
          formatter={(value: string) => (
            <span className="text-xs text-slate-700 dark:text-slate-300">
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
      <p className="text-sm text-slate-400 dark:text-slate-500">
        No regulatory items yet. Start a module assessment to populate.
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
        barSize={28}
      >
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "currentColor" }}
          interval={0}
          angle={-25}
          textAnchor="end"
          height={60}
          stroke="currentColor"
          className="text-slate-500 dark:text-slate-400"
        />
        <YAxis
          domain={[0, 100]}
          unit="%"
          tick={{ fontSize: 10, fill: "currentColor" }}
          stroke="currentColor"
          className="text-slate-500 dark:text-slate-400"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(15, 23, 42, 0.92)",
            border: "none",
            borderRadius: 8,
            color: "#f8fafc",
            fontSize: 12,
          }}
        />
        <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]} />
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
