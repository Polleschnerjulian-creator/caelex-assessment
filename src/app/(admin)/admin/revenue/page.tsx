"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Revenue — the board-grade recurring-revenue screen.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The ONE screen a board member opens to read the business: plan-priced MRR/ARR,
 * the MRR-movement waterfall (new / expansion / contraction / churn), the active
 * base by plan, the retention/efficiency ratios (NRR + Quick-Ratio) with SaaS
 * benchmark verdicts, a 90-day MRR forecast, and the cash runway. Fed by
 * GET /api/admin/v2/revenue?range=<range> ({@link RevenueBoardResponse}).
 *
 * Sections, top to bottom:
 *   1. Page header + range tabs + an "as of" freshness stamp.
 *   2. Headline KPIs — MRR, ARR, ARPA, paying-account churn.
 *   3. Benchmarks — NRR + Quick-Ratio (and Rule-of-40 / Magic-Number if/when a
 *      margin or S&M-spend source ever lands) with a strong/healthy/watch/weak band.
 *   4. MRR-movement waterfall — the net change since the prior snapshot.
 *   5. Plan mix — the active base + MRR by plan.
 *   6. 90-day forecast — a linear-regression MRR projection + cash runway.
 *
 * Loading → skeleton; error → inline message; empty (no paying accounts AND no
 * second snapshot to diff) → a friendly explainer. This component is a THIN
 * renderer — every number comes from the unit-tested pure helpers in
 * `revenue.ts` / `forecast.ts` / `benchmarks.ts`; nothing is computed,
 * randomised, or hard-coded here.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Minus,
  TrendingUp,
} from "lucide-react";
import type { AdminRange } from "@/lib/admin/analytics-types";
import type { RevenueMetrics, PlanMixEntry } from "@/lib/admin/revenue";
import type { RevenueForecast } from "@/lib/admin/forecast";
import type { Benchmark, BenchmarkVerdict } from "@/lib/admin/benchmarks";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminCard from "@/components/admin/AdminCard";
import KpiTile from "@/components/admin/KpiTile";
import RangeTabs from "@/components/admin/RangeTabs";
import ExportButton from "@/components/admin/ExportButton";
import type { CsvRow } from "@/components/admin/export-utils";
import { useAdminData } from "@/components/admin/useAdminData";
import { eur, pctLabel } from "@/components/admin/format";

/**
 * The page's view of the revenue route payload. Re-declared here (composed from
 * the three shared helper TYPES via `import type`) rather than imported from the
 * server route, so this client component never pulls the server-only route graph.
 */
interface RevenueBoardResponse extends RevenueMetrics {
  forecast: RevenueForecast;
  benchmarks: Benchmark[];
}

/** Human label for a plan key. Kept tiny + local so the page stays self-contained. */
function planLabel(plan: string): string {
  const p = plan.toUpperCase();
  if (p === "FREE") return "Free";
  if (p === "STARTER") return "Starter";
  if (p === "PROFESSIONAL") return "Professional";
  if (p === "ENTERPRISE") return "Enterprise";
  return plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();
}

/**
 * Exact-Euro formatter with deterministic thousands separators — for the precise
 * captions under the compact KPI values. We DON'T use `toLocaleString` so the
 * server (RSC) and client render the identical string (no hydration mismatch,
 * no locale dependence). Cents are shown only when non-zero.
 */
function exactEur(n: number): string {
  if (!Number.isFinite(n)) return "€0";
  const neg = n < 0;
  const abs = Math.abs(n);
  const whole = Math.floor(abs);
  const cents = Math.round((abs - whole) * 100);
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body =
    cents > 0 ? `${grouped}.${String(cents).padStart(2, "0")}` : grouped;
  return `${neg ? "-" : ""}€${body}`;
}

/** Format an NRR/quick-ratio benchmark value per its key (NRR → %, others → ×). */
function formatBenchmarkValue(b: Benchmark): string {
  if (b.key === "nrr") return pctLabel(b.value);
  if (b.key === "ruleOf40") return `${Math.round(b.value)}%`;
  // quickRatio + magicNumber read as multiples.
  return `${b.value.toFixed(b.value >= 10 ? 0 : 2)}×`;
}

export default function RevenuePage() {
  const [range, setRange] = useState<AdminRange>("30d");
  const { data, loading, error } = useAdminData<RevenueBoardResponse>(
    `/api/admin/v2/revenue?range=${range}`,
  );

  // Export rows derived from the ALREADY-FETCHED view-model — no extra fetch.
  // The plan-mix table is the most useful tabular cut (one row per plan, with a
  // share-of-MRR column); the four MRR-movement legs are appended as their own
  // rows under a synthetic "Movement (…)" plan label so the single download
  // carries both the active base and the net change since the prior snapshot.
  const exportRows = useMemo<CsvRow[]>(() => {
    if (!data || data.isEmpty) return [];
    const planRows: CsvRow[] = data.planMix.map((row) => ({
      plan: planLabel(row.plan),
      accounts: row.count,
      mrr_eur: row.mrr,
      share_of_mrr: data.mrr > 0 ? pctLabel(row.mrr / data.mrr) : "—",
    }));
    const m = data.movement;
    const movementRows: CsvRow[] = [
      {
        plan: "Movement · New",
        accounts: "",
        mrr_eur: m.newMrr,
        share_of_mrr: "",
      },
      {
        plan: "Movement · Expansion",
        accounts: "",
        mrr_eur: m.expansionMrr,
        share_of_mrr: "",
      },
      {
        plan: "Movement · Contraction",
        accounts: "",
        mrr_eur: -m.contractionMrr,
        share_of_mrr: "",
      },
      {
        plan: "Movement · Churned",
        accounts: "",
        mrr_eur: -m.churnedMrr,
        share_of_mrr: "",
      },
    ];
    return [...planRows, ...movementRows];
  }, [data]);

  return (
    <div>
      <AdminPageHeader
        title="Revenue"
        subtitle="Plan-priced MRR, movement, retention benchmarks, and the 90-day forecast"
        right={
          <div className="flex items-center gap-3">
            {data && !loading && !error && !data.isEmpty && (
              <span
                className="hidden text-[11px] tabular-nums sm:inline"
                style={{ color: "var(--text-tertiary)" }}
              >
                as of {data.asOf.slice(0, 10)}
              </span>
            )}
            {data && !loading && !error && !data.isEmpty && (
              <ExportButton
                rows={exportRows}
                filename={`caelex-revenue-${range}`}
                columns={[
                  { key: "plan", header: "Plan / Movement" },
                  { key: "accounts", header: "Accounts" },
                  { key: "mrr_eur", header: "MRR (EUR/mo)" },
                  { key: "share_of_mrr", header: "Share of MRR" },
                ]}
                label="Export"
              />
            )}
            <RangeTabs value={range} onChange={setRange} />
          </div>
        }
      />

      {loading && <RevenueSkeleton />}

      {!loading && error && (
        <AdminCard>
          <p
            className="text-[13px] leading-snug"
            style={{ color: "var(--accent-danger)" }}
          >
            Could not load revenue: {error}
          </p>
        </AdminCard>
      )}

      {!loading && !error && data && data.isEmpty && (
        <AdminCard>
          <EmptyState />
        </AdminCard>
      )}

      {!loading && !error && data && !data.isEmpty && (
        <RevenueBody data={data} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Body — the populated revenue screen.
 * ────────────────────────────────────────────────────────────────────────── */

function RevenueBody({ data }: { data: RevenueBoardResponse }) {
  return (
    <div className="flex flex-col gap-5">
      <HeadlineKpis data={data} />

      <AdminCard
        title="Retention & efficiency benchmarks"
        subtitle="Against the canonical SaaS rules of thumb — only what the data supports"
      >
        <BenchmarkRow benchmarks={data.benchmarks} />
      </AdminCard>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AdminCard
          title="MRR movement"
          subtitle="Net change since the prior snapshot"
        >
          <MovementWaterfall data={data} />
        </AdminCard>

        <AdminCard title="Plan mix" subtitle="Active base and MRR by plan">
          <PlanMixTable rows={data.planMix} mrrTotal={data.mrr} />
        </AdminCard>
      </div>

      <AdminCard
        title="90-day forecast"
        subtitle="Linear projection of MRR from the snapshot history, plus cash runway"
      >
        <ForecastSection forecast={data.forecast} currentMrr={data.mrr} />
      </AdminCard>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Headline KPIs — MRR, ARR, ARPA, logo churn.
 * ────────────────────────────────────────────────────────────────────────── */

function HeadlineKpis({ data }: { data: RevenueBoardResponse }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KpiTile label="MRR" value={eur(data.mrr)} sub={exactEur(data.mrr)} />
      <KpiTile label="ARR" value={eur(data.arr)} sub={exactEur(data.arr)} />
      <KpiTile
        label="ARPA"
        value={eur(data.arpa)}
        sub="per paying account / mo"
      />
      <KpiTile
        label="Logo churn"
        value={data.logoChurnRate === null ? "—" : pctLabel(data.logoChurnRate)}
        sub={
          data.logoChurnRate === null ? "no base in range" : "of the logo base"
        }
        tone={
          data.logoChurnRate === null
            ? "default"
            : data.logoChurnRate > 0.05
              ? "danger"
              : "default"
        }
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Benchmarks — NRR + Quick-Ratio (and more if the data ever supports them).
 * ────────────────────────────────────────────────────────────────────────── */

/** Map a verdict band to the accent token pair (text + soft background). */
const VERDICT_STYLE: Record<
  BenchmarkVerdict,
  { color: string; bg: string; label: string }
> = {
  strong: {
    color: "var(--accent-success)",
    bg: "var(--accent-success-soft)",
    label: "Strong",
  },
  healthy: {
    color: "var(--accent-success)",
    bg: "var(--accent-success-soft)",
    label: "Healthy",
  },
  watch: { color: "#f59e0b", bg: "rgba(245,158,11,0.14)", label: "Watch" },
  weak: {
    color: "var(--accent-danger)",
    bg: "var(--accent-danger-soft)",
    label: "Weak",
  },
};

function BenchmarkRow({ benchmarks }: { benchmarks: Benchmark[] }) {
  if (benchmarks.length === 0) {
    return (
      <p
        className="py-6 text-center text-[12px] leading-snug"
        style={{ color: "var(--text-tertiary)" }}
      >
        Not enough revenue history to benchmark yet. NRR and Quick-Ratio appear
        once there are at least two recurring-revenue snapshots to compare.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {benchmarks.map((b) => (
        <BenchmarkCard key={b.key} benchmark={b} />
      ))}
    </div>
  );
}

function BenchmarkCard({ benchmark }: { benchmark: Benchmark }) {
  const style = VERDICT_STYLE[benchmark.verdict];
  const thresholdLabel =
    benchmark.key === "nrr"
      ? `target ≥ ${pctLabel(benchmark.threshold)}`
      : benchmark.key === "ruleOf40"
        ? `target ≥ ${benchmark.threshold}%`
        : `target ≥ ${benchmark.threshold}×`;
  return (
    <div
      className="glass-surface rounded-xl p-4"
      style={{ border: "1px solid var(--border-default)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[11px] font-medium uppercase tracking-[0.06em]"
            style={{ color: "var(--text-secondary)" }}
          >
            {benchmark.label}
          </p>
          <p
            className="mt-1.5 text-[24px] font-semibold leading-none tabular-nums"
            style={{ color: "var(--text-primary)" }}
          >
            {formatBenchmarkValue(benchmark)}
          </p>
        </div>
        <span
          className="flex-shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium"
          style={{ color: style.color, background: style.bg }}
        >
          {style.label}
        </span>
      </div>
      <p
        className="mt-2 text-[11px] leading-snug"
        style={{ color: "var(--text-tertiary)" }}
      >
        {benchmark.note}{" "}
        <span style={{ color: "var(--text-secondary)" }}>{thresholdLabel}</span>
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * MRR-movement waterfall — new / expansion (up) vs contraction / churn (down),
 * rendered as signed bars relative to the largest movement. The net delta is
 * stated explicitly so a flat (all-zero) period reads as "no change".
 * ────────────────────────────────────────────────────────────────────────── */

function MovementWaterfall({ data }: { data: RevenueBoardResponse }) {
  const m = data.movement;
  const rows = [
    { label: "New", value: m.newMrr, positive: true },
    { label: "Expansion", value: m.expansionMrr, positive: true },
    { label: "Contraction", value: m.contractionMrr, positive: false },
    { label: "Churned", value: m.churnedMrr, positive: false },
  ];
  const maxAbs = rows.reduce((mx, r) => (r.value > mx ? r.value : mx), 0);
  const net = m.newMrr + m.expansionMrr - m.contractionMrr - m.churnedMrr;

  if (maxAbs <= 0) {
    return (
      <p
        className="py-6 text-center text-[12px] leading-snug"
        style={{ color: "var(--text-tertiary)" }}
      >
        No MRR movement since the prior snapshot. The waterfall fills in as
        plans change between daily snapshots.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {rows.map((row) => {
        const color = row.positive
          ? "var(--accent-success)"
          : "var(--accent-danger)";
        return (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between gap-3">
              <span
                className="text-[12px] font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {row.label}
              </span>
              <span
                className="flex-shrink-0 text-[12px] tabular-nums"
                style={{
                  color: row.value > 0 ? color : "var(--text-tertiary)",
                }}
              >
                {row.value > 0 ? (row.positive ? "+" : "−") : ""}
                {eur(row.value)}
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full"
              style={{
                background: "var(--separator-strong, rgba(148,163,184,0.16))",
              }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${maxAbs > 0 ? (row.value / maxAbs) * 100 : 0}%`,
                  background: color,
                }}
              />
            </div>
          </div>
        );
      })}

      {/* Net delta line. */}
      <div
        className="mt-1 flex items-center justify-between border-t pt-3"
        style={{ borderColor: "var(--border-default)" }}
      >
        <span
          className="text-[12px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Net change
        </span>
        <span
          className="text-[14px] font-semibold tabular-nums"
          style={{
            color:
              net > 0
                ? "var(--accent-success)"
                : net < 0
                  ? "var(--accent-danger)"
                  : "var(--text-secondary)",
          }}
        >
          {net > 0 ? "+" : net < 0 ? "−" : ""}
          {eur(Math.abs(net))}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Plan mix — the active base by plan, with a share-of-MRR bar.
 * ────────────────────────────────────────────────────────────────────────── */

function PlanMixTable({
  rows,
  mrrTotal,
}: {
  rows: PlanMixEntry[];
  mrrTotal: number;
}) {
  if (rows.length === 0) {
    return (
      <p
        className="py-6 text-center text-[12px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        No active subscriptions to break down yet.
      </p>
    );
  }
  const maxMrr = rows.reduce((mx, r) => (r.mrr > mx ? r.mrr : mx), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="text-left" style={{ color: "var(--text-secondary)" }}>
            <th className="pb-2 font-medium">Plan</th>
            <th className="pb-2 text-right font-medium tabular-nums">
              Accounts
            </th>
            <th className="pb-2 text-right font-medium tabular-nums">MRR</th>
            <th className="hidden pb-2 pl-4 font-medium sm:table-cell">
              Share
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const share = mrrTotal > 0 ? row.mrr / mrrTotal : 0;
            return (
              <tr
                key={row.plan}
                className="border-t"
                style={{ borderColor: "var(--border-default)" }}
              >
                <td
                  className="py-2 font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {planLabel(row.plan)}
                </td>
                <td
                  className="py-2 text-right tabular-nums"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {row.count}
                </td>
                <td
                  className="py-2 text-right tabular-nums"
                  style={{ color: "var(--text-primary)" }}
                >
                  {eur(row.mrr)}
                </td>
                <td className="hidden py-2 pl-4 align-middle sm:table-cell">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full"
                      style={{
                        background:
                          "var(--separator-strong, rgba(148,163,184,0.16))",
                      }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${maxMrr > 0 ? (row.mrr / maxMrr) * 100 : 0}%`,
                          background: "var(--accent-primary)",
                        }}
                      />
                    </div>
                    <span
                      className="w-9 flex-shrink-0 text-right tabular-nums"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {pctLabel(share)}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 90-day forecast — an inline-SVG MRR projection (no chart dependency, fully
 * hydration-safe) plus the headline projected numbers and the cash runway.
 * ────────────────────────────────────────────────────────────────────────── */

function ForecastSection({
  forecast,
  currentMrr,
}: {
  forecast: RevenueForecast;
  currentMrr: number;
}) {
  if (forecast.isEmpty) {
    return (
      <div className="flex flex-col gap-4">
        <p
          className="py-2 text-[12px] leading-snug"
          style={{ color: "var(--text-tertiary)" }}
        >
          Not enough history to forecast yet — a trend needs at least three
          daily revenue snapshots. The projection appears automatically once
          they accrue (one is written each time this page loads).
        </p>
        <RunwayLine runway={forecast.runway} />
      </div>
    );
  }

  const trendUp = forecast.projectedMrr90d >= forecast.currentMrr;

  return (
    <div className="flex flex-col gap-5">
      {/* Projection headline. */}
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <ForecastStat
          label="MRR in 90 days"
          value={eur(forecast.projectedMrr90d)}
          delta={forecast.monthlyMrrSlope}
          deltaSuffix="/mo trend"
        />
        <ForecastStat
          label="ARR in 90 days"
          value={eur(forecast.projectedArr90d)}
        />
        <ForecastStat
          label="Based on"
          value={`${forecast.basis} day${forecast.basis === 1 ? "" : "s"}`}
        />
      </div>

      <ForecastChart
        forecast={forecast}
        currentMrr={currentMrr}
        trendUp={trendUp}
      />

      <RunwayLine runway={forecast.runway} />
    </div>
  );
}

function ForecastStat({
  label,
  value,
  delta,
  deltaSuffix,
}: {
  label: string;
  value: string;
  delta?: number;
  deltaSuffix?: string;
}) {
  return (
    <div>
      <p
        className="text-[10px] font-medium uppercase tracking-[0.06em]"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </p>
      <p
        className="mt-1 flex items-end gap-2 text-[22px] font-semibold leading-none tabular-nums"
        style={{ color: "var(--text-primary)" }}
      >
        {value}
        {typeof delta === "number" && (
          <span
            className="mb-0.5 inline-flex items-center gap-0.5 text-[12px] font-medium tabular-nums"
            style={{
              color:
                delta > 0
                  ? "var(--accent-success)"
                  : delta < 0
                    ? "var(--accent-danger)"
                    : "var(--text-tertiary)",
            }}
          >
            {delta > 0 ? (
              <ArrowUpRight size={13} />
            ) : delta < 0 ? (
              <ArrowDownRight size={13} />
            ) : (
              <Minus size={13} />
            )}
            {delta > 0 ? "+" : delta < 0 ? "−" : ""}
            {eur(Math.abs(delta))}
            {deltaSuffix ? (
              <span style={{ color: "var(--text-tertiary)" }}>
                {" "}
                {deltaSuffix}
              </span>
            ) : null}
          </span>
        )}
      </p>
    </div>
  );
}

/**
 * The projection line as a responsive inline SVG. We plot the current fitted MRR
 * as the anchor point at x=0 and the weekly forecast points after it, scaling y
 * to the series' own min/max so the slope is legible. No external chart lib (the
 * whole admin surface is dependency-light), and no random/locale dependence, so
 * it renders identically on server and client.
 */
function ForecastChart({
  forecast,
  currentMrr,
  trendUp,
}: {
  forecast: RevenueForecast;
  currentMrr: number;
  trendUp: boolean;
}) {
  const W = 720;
  const H = 160;
  const PAD = 8;

  const geom = useMemo(() => {
    // Series = the fitted "today" point + each weekly projection.
    const values = [currentMrr, ...forecast.points.map((p) => p.mrr)];
    const n = values.length;
    if (n < 2) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1; // avoid /0 on a flat line

    const x = (i: number) => PAD + (i / (n - 1)) * (W - PAD * 2);
    const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);

    const pts = values.map((v, i) => ({ x: x(i), y: y(v) }));
    const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
    // Area path: line, then down to the baseline and back.
    const area =
      `M ${pts[0].x},${H - PAD} ` +
      pts.map((p) => `L ${p.x},${p.y}`).join(" ") +
      ` L ${pts[pts.length - 1].x},${H - PAD} Z`;

    return {
      pts,
      line,
      area,
      lastX: pts[pts.length - 1].x,
      lastY: pts[pts.length - 1].y,
    };
  }, [forecast.points, currentMrr]);

  const stroke = trendUp ? "var(--accent-success)" : "var(--accent-danger)";

  if (!geom) {
    return (
      <p
        className="py-4 text-center text-[12px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        Projection unavailable.
      </p>
    );
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-40 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Ninety-day MRR projection, ${
          trendUp ? "trending up" : "trending down"
        } to ${eur(forecast.projectedMrr90d)} per month.`}
      >
        <defs>
          <linearGradient id="revFcGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={geom.area} fill="url(#revFcGrad)" stroke="none" />
        <polyline
          points={geom.line}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Endpoint marker. */}
        <circle cx={geom.lastX} cy={geom.lastY} r={3.5} fill={stroke} />
      </svg>
      <div
        className="mt-1.5 flex items-center justify-between text-[11px] tabular-nums"
        style={{ color: "var(--text-tertiary)" }}
      >
        <span>today · {eur(currentMrr)}</span>
        <span>
          +90 days · {forecast.points[forecast.points.length - 1]?.date}
        </span>
      </div>
    </div>
  );
}

/** The cash-runway readout. Honest about the (usually-absent) manual cash input. */
function RunwayLine({ runway }: { runway: RevenueForecast["runway"] }) {
  if (runway.isEmpty) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg p-3 text-[12px] leading-snug glass-surface"
        style={{
          border: "1px solid var(--border-default)",
          color: "var(--text-tertiary)",
        }}
      >
        <CircleDollarSign
          size={14}
          style={{ color: "var(--text-secondary)" }}
        />
        Cash runway is unset — add a cash balance and monthly burn to a revenue
        snapshot to see months of runway here.
      </div>
    );
  }

  const monthsLabel = runway.isInfinite
    ? "∞"
    : runway.runwayMonths === null
      ? "—"
      : `${runway.runwayMonths.toFixed(1)} mo`;
  const tone =
    runway.isInfinite || runway.runwayMonths === null
      ? "var(--text-primary)"
      : runway.runwayMonths < 6
        ? "var(--accent-danger)"
        : runway.runwayMonths < 12
          ? "#f59e0b"
          : "var(--accent-success)";

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg p-3 glass-surface"
      style={{ border: "1px solid var(--border-default)" }}
    >
      <div className="flex items-center gap-2">
        <CircleDollarSign
          size={15}
          style={{ color: "var(--accent-primary)" }}
        />
        <span
          className="text-[12px] font-medium uppercase tracking-[0.05em]"
          style={{ color: "var(--text-secondary)" }}
        >
          Cash runway
        </span>
        <span
          className="text-[16px] font-semibold tabular-nums"
          style={{ color: tone }}
        >
          {monthsLabel}
        </span>
      </div>
      <div
        className="flex items-center gap-4 text-[12px] tabular-nums"
        style={{ color: "var(--text-tertiary)" }}
      >
        {runway.cashBalance !== null && (
          <span>cash {eur(runway.cashBalance)}</span>
        )}
        {runway.burnRate !== null && (
          <span>burn {eur(runway.burnRate)}/mo</span>
        )}
        {runway.zeroCashDate && <span>zero · {runway.zeroCashDate}</span>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * States.
 * ────────────────────────────────────────────────────────────────────────── */

function RevenueSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass-surface h-[86px] animate-pulse rounded-xl"
            style={{ border: "1px solid var(--border-default)" }}
          />
        ))}
      </div>
      <div
        className="glass-elevated h-[140px] animate-pulse rounded-2xl"
        style={{ border: "1px solid var(--border-default)" }}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div
          className="glass-elevated h-[240px] animate-pulse rounded-2xl"
          style={{ border: "1px solid var(--border-default)" }}
        />
        <div
          className="glass-elevated h-[240px] animate-pulse rounded-2xl"
          style={{ border: "1px solid var(--border-default)" }}
        />
      </div>
      <div
        className="glass-elevated h-[260px] animate-pulse rounded-2xl"
        style={{ border: "1px solid var(--border-default)" }}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl glass-surface"
        style={{ border: "1px solid var(--border-default)" }}
      >
        <TrendingUp size={20} style={{ color: "var(--text-secondary)" }} />
      </div>
      <p
        className="text-[14px] font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        No recurring revenue recorded yet
      </p>
      <p
        className="max-w-sm text-[12px] leading-snug"
        style={{ color: "var(--text-secondary)" }}
      >
        MRR is the sum of every active subscription&apos;s plan price. As soon
        as an organization is on a paid plan — or a second revenue snapshot
        exists to diff — the headline, movement waterfall, benchmarks, and
        forecast fill in.
      </p>
    </div>
  );
}
