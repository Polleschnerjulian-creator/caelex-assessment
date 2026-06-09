"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — the cross-product COCKPIT (Phase 4, flagship view).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The /admin landing page: one cross-product overview fed by
 * GET /api/admin/v2/cockpit?range=<range> ({@link CockpitResponse}). A
 * {@link RangeTabs} control re-derives the fetch URL (last-write-wins via
 * {@link useAdminData}, which aborts the prior request on a fast toggle).
 *
 * Sections, top to bottom:
 *   1. Page header + range tabs + an "as of" freshness stamp (from the route's
 *      `generatedAt`, formatted hydration-safe in `cockpit-data.ts`).
 *   2. Revenue headline — plan-priced MRR + NRR (from the revenue lane), or an
 *      honest empty state when revenue is structurally absent (never €0-as-win).
 *   3. KPI row — DAU / WAU / MAU (latest-day point-in-time) and Signups /
 *      Page views / Revenue (summed across the range).
 *   4. Depth by product — REAL value-events from authoritative domain tables
 *      (assessments, classifications, screening hit-rate, licenses, AI messages
 *      + USD cost, documents) shaped in `cockpit-data.ts`.
 *   5. DAU trend — an area+line sparkline over `dauTrend`.
 *   6. Usage by product — a compact table over `perProduct` (order preserved).
 *   7. Growth funnel — a horizontal bar list over `growthFunnel`, with the
 *      per-step completion % computed in `cockpit-data.ts` (this file stays a
 *      thin renderer; the arithmetic is unit-tested there).
 *
 * Loading → skeleton; error → inline message; empty (pre-go-live rollups) → a
 * friendly explainer. This component is intentionally a thin wrapper — every
 * non-trivial calculation lives in the tested pure helper next door.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { BarChart3 } from "lucide-react";
import type { AdminRange } from "@/lib/admin/analytics-types";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminCard from "@/components/admin/AdminCard";
import KpiTile from "@/components/admin/KpiTile";
import RangeTabs from "@/components/admin/RangeTabs";
import { useAdminData } from "@/components/admin/useAdminData";
import { compactNumber, eur, pctLabel } from "@/components/admin/format";
import {
  funnelWithConversion,
  isCockpitEmpty,
  isDepthEmpty,
  formatAsOf,
  type CockpitResponseV2,
  type ProductDepthVM,
} from "./cockpit-data";

export default function CockpitPage() {
  // The page owns the selected range; RangeTabs only reports changes and the
  // URL below is re-derived from it (the hook aborts the prior fetch on toggle).
  const [range, setRange] = useState<AdminRange>("30d");
  const { data, loading, error } = useAdminData<CockpitResponseV2>(
    `/api/admin/v2/cockpit?range=${range}`,
  );

  // Freshness: render the route's generatedAt as a stable "as of <date>" stamp
  // (computed hydration-safe in the helper). Only shown once data is in hand.
  const asOf = data ? formatAsOf(data.generatedAt) : null;

  return (
    <div>
      <AdminPageHeader
        title="Cockpit"
        subtitle={
          asOf
            ? `Cross-product platform overview · as of ${asOf}`
            : "Cross-product platform overview"
        }
        right={<RangeTabs value={range} onChange={setRange} />}
      />

      {loading && <CockpitSkeleton />}

      {!loading && error && (
        <AdminCard>
          <p
            className="text-[13px] leading-snug"
            style={{ color: "var(--accent-danger)" }}
          >
            Could not load the cockpit: {error}
          </p>
        </AdminCard>
      )}

      {!loading && !error && data && isCockpitEmpty(data) && (
        <AdminCard>
          <EmptyState />
        </AdminCard>
      )}

      {!loading && !error && data && !isCockpitEmpty(data) && (
        <CockpitBody data={data} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Body — the populated cockpit. Split out so the top-level component reads as a
 * clean state machine (loading / error / empty / body).
 * ────────────────────────────────────────────────────────────────────────── */

function CockpitBody({ data }: { data: CockpitResponseV2 }) {
  const { kpis, dauTrend, perProduct, growthFunnel, perProductDepth, revenue } =
    data;
  const funnel = funnelWithConversion(growthFunnel);

  return (
    <div className="flex flex-col gap-5">
      {/* Revenue headline — MRR + NRR, or an honest empty state. */}
      <RevenueHeadline revenue={revenue} />

      {/* KPI row — 3 point-in-time + 3 range-summed stats. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile label="DAU" value={compactNumber(kpis.dau)} sub="latest day" />
        <KpiTile label="WAU" value={compactNumber(kpis.wau)} sub="latest day" />
        <KpiTile label="MAU" value={compactNumber(kpis.mau)} sub="latest day" />
        <KpiTile
          label="Signups"
          value={compactNumber(kpis.signups)}
          sub="this range"
        />
        <KpiTile
          label="Page views"
          value={compactNumber(kpis.pageViews)}
          sub="this range"
        />
        <KpiTile
          label="Revenue"
          value={eur(kpis.revenue)}
          // Booked financial-entry revenue for the range — distinct from the
          // plan-priced MRR headline above. Neutral tone on a true €0 so an empty
          // FinancialEntry table never reads as a green "success".
          sub="booked this range"
          tone={kpis.revenue > 0 ? "positive" : "default"}
        />
      </div>

      {/* Depth by product — REAL value-events from authoritative domain tables. */}
      <AdminCard
        title="Depth by product"
        subtitle="Value-events produced this range — from authoritative domain tables, not page events"
      >
        {isDepthEmpty(perProductDepth) ? (
          <NoSeries label="No value-events recorded for this range yet." />
        ) : (
          <ProductDepthTable rows={perProductDepth} />
        )}
      </AdminCard>

      {/* DAU trend sparkline. */}
      <AdminCard title="DAU trend" subtitle="Daily active users over the range">
        {dauTrend.length > 0 ? (
          <DauTrendChart points={dauTrend} />
        ) : (
          <NoSeries label="No daily-active data for this range yet." />
        )}
      </AdminCard>

      {/* Usage by product — order preserved from the API. */}
      <AdminCard
        title="Usage by product"
        subtitle="Activity across the six product surfaces"
      >
        {perProduct.length > 0 ? (
          <ProductUsageTable rows={perProduct} />
        ) : (
          <NoSeries label="No per-product usage recorded for this range yet." />
        )}
      </AdminCard>

      {/* Growth funnel — entrants per step + step-to-step conversion. */}
      <AdminCard
        title="Growth funnel"
        subtitle="Latest cross-product onboarding funnel"
      >
        {funnel.length > 0 ? (
          <GrowthFunnel steps={funnel} />
        ) : (
          <NoSeries label="No funnel snapshot computed yet." />
        )}
      </AdminCard>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Revenue headline — plan-priced MRR + NRR as two big tiles. When the revenue
 * lane reports `isEmpty` (no recurring revenue rows / revenue not yet wired) we
 * render an HONEST empty state instead of a €0 tile that reads like a real zero.
 * ────────────────────────────────────────────────────────────────────────── */

function RevenueHeadline({
  revenue,
}: {
  revenue: CockpitResponseV2["revenue"];
}) {
  if (revenue.isEmpty) {
    return (
      <AdminCard
        title="Revenue"
        subtitle={
          revenue.asOf
            ? `Plan-priced recurring revenue · as of ${revenue.asOf}`
            : "Plan-priced recurring revenue"
        }
      >
        <p
          className="py-6 text-center text-[12px] leading-snug"
          style={{ color: "var(--text-tertiary)" }}
        >
          No recurring revenue recorded yet. Once billing data is in place, MRR
          and NRR appear here.
        </p>
      </AdminCard>
    );
  }

  return (
    <AdminCard
      title="Revenue"
      subtitle={
        revenue.asOf
          ? `Plan-priced recurring revenue · as of ${revenue.asOf}`
          : "Plan-priced recurring revenue"
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <KpiTile
          label="MRR"
          value={eur(revenue.mrr)}
          sub="monthly recurring"
          tone="positive"
        />
        <KpiTile
          label="NRR"
          value={revenue.nrr === null ? "—" : pctLabel(revenue.nrr)}
          sub="net revenue retention"
          tone={
            revenue.nrr === null
              ? "default"
              : revenue.nrr >= 1
                ? "positive"
                : "warning"
          }
        />
      </div>
    </AdminCard>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Depth-by-product table — the REAL per-product value-events from authoritative
 * domain tables. Counts are compact; the screening hit-rate is a percent with an
 * "of N" caption, or an em-dash when there were no screenings to rate (honest
 * "no sample" — NOT a misleading 0%). AI cost is summed AtlasMessage.costUsd,
 * shown precisely (sub-dollar) rather than compacted.
 * ────────────────────────────────────────────────────────────────────────── */

/** Precise USD for the (typically sub-dollar) AI cost; "$0" when there is none. */
function usdCost(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "$0";
  // 2 dp for cents-scale spend, but drop to whole dollars once it's large.
  return n >= 100 ? `$${Math.round(n)}` : `$${n.toFixed(2)}`;
}

function ProductDepthTable({ rows }: { rows: ProductDepthVM[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="text-left" style={{ color: "var(--text-secondary)" }}>
            <Th className="text-left">Product</Th>
            <Th className="text-right">Assessments</Th>
            <Th className="text-right">Classifications</Th>
            <Th className="text-right">Screen hit-rate</Th>
            <Th className="text-right">Licenses</Th>
            <Th className="text-right">AI msgs</Th>
            <Th className="text-right">Docs</Th>
            <Th className="text-right">AI cost</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.product}
              style={{ borderTop: "1px solid var(--border-default)" }}
            >
              <Td className="text-left">
                <span
                  className="font-medium capitalize"
                  style={{ color: "var(--text-primary)" }}
                >
                  {row.product}
                </span>
              </Td>
              <Td className="text-right tabular-nums">
                {compactNumber(row.assessmentsCompleted)}
              </Td>
              <Td className="text-right tabular-nums">
                {compactNumber(row.classifications)}
              </Td>
              <Td className="text-right tabular-nums">
                {row.screeningHitRate === null ? (
                  // No screenings → no rate. Em-dash, not "0%".
                  <span style={{ color: "var(--text-tertiary)" }}>—</span>
                ) : (
                  <>
                    {pctLabel(row.screeningHitRate)}
                    <span
                      className="ml-1 text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      of {compactNumber(row.screeningsTotal)}
                    </span>
                  </>
                )}
              </Td>
              <Td className="text-right tabular-nums">
                {compactNumber(row.licensesIssued)}
              </Td>
              <Td className="text-right tabular-nums">
                {compactNumber(row.aiMessages)}
              </Td>
              <Td className="text-right tabular-nums">
                {compactNumber(row.documentsGenerated)}
              </Td>
              <Td className="text-right tabular-nums">
                {row.aiCostUsd > 0 ? (
                  usdCost(row.aiCostUsd)
                ) : (
                  <span style={{ color: "var(--text-tertiary)" }}>—</span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * DAU trend chart — matches the established analytics-page Recharts language:
 * a soft emerald area under an emerald line, muted axis ticks, token-coloured
 * grid + tooltip.
 * ────────────────────────────────────────────────────────────────────────── */

function DauTrendChart({ points }: { points: CockpitResponseV2["dauTrend"] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--separator-strong)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={40}
            allowDecimals={false}
            tickFormatter={(v: number) => compactNumber(v)}
          />
          <Tooltip
            cursor={{ stroke: "var(--separator-strong)" }}
            contentStyle={{
              background: "var(--surface-raised, #0F172A)",
              border: "1px solid var(--border-default)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--text-primary)",
            }}
            labelStyle={{ color: "var(--text-secondary)" }}
            formatter={(value): [string, string] => [
              compactNumber(Number(value)),
              "DAU",
            ]}
          />
          {/* Area first (the soft fill), then the crisp line on top — same
              layering the dashboard analytics chart uses. */}
          <Area
            type="monotone"
            dataKey="value"
            fill="#10B98120"
            stroke="none"
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#10B981"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Usage-by-product table. Order is preserved as the API returns it (the lane
 * contract says "sorted as given"). Numbers are compact-formatted; dwell is
 * seconds or an em-dash when the rollup has no duration sample.
 * ────────────────────────────────────────────────────────────────────────── */

function ProductUsageTable({
  rows,
}: {
  rows: CockpitResponseV2["perProduct"];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="text-left" style={{ color: "var(--text-secondary)" }}>
            <Th className="text-left">Product</Th>
            <Th className="text-right">Features</Th>
            <Th className="text-right">Peak users</Th>
            <Th className="text-right">Actions</Th>
            <Th className="text-right">Avg dwell</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.product}
              style={{ borderTop: "1px solid var(--border-default)" }}
            >
              <Td className="text-left">
                <span
                  className="font-medium capitalize"
                  style={{ color: "var(--text-primary)" }}
                >
                  {row.product}
                </span>
              </Td>
              <Td className="text-right tabular-nums">
                {compactNumber(row.features)}
              </Td>
              <Td className="text-right tabular-nums">
                {compactNumber(row.peakDailyUsers)}
              </Td>
              <Td className="text-right tabular-nums">
                {compactNumber(row.totalActions)}
              </Td>
              <Td className="text-right tabular-nums">
                {row.avgDwellSecs === null
                  ? "—"
                  : `${row.avgDwellSecs.toFixed(1)}s`}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.05em] ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`px-2 py-2.5 ${className}`}
      style={{ color: "var(--text-secondary)" }}
    >
      {children}
    </td>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Growth funnel — a horizontal bar list. Each row shows the step key, an
 * emerald bar whose width is the step's share of the funnel's widest stage
 * (`barWidthPct`, computed in the helper), the absolute entrants, and the
 * step's completion conversion %.
 * ────────────────────────────────────────────────────────────────────────── */

function GrowthFunnel({
  steps,
}: {
  steps: ReturnType<typeof funnelWithConversion>;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {steps.map((step, i) => (
        <li key={`${step.stepKey}-${i}`}>
          <div className="mb-1 flex items-center justify-between gap-3">
            <span
              className="truncate text-[12px] font-medium"
              style={{ color: "var(--text-primary)" }}
              title={step.stepKey}
            >
              {step.stepKey}
            </span>
            <span
              className="flex-shrink-0 text-[12px] tabular-nums"
              style={{ color: "var(--text-secondary)" }}
            >
              {compactNumber(step.usersEntered)} entered
              <span style={{ color: "var(--text-tertiary)" }}>
                {" · "}
                {pctLabel(step.conversion)} completed
              </span>
            </span>
          </div>
          {/* Track + fill. The fill width is the helper-computed share of the
              widest stage so the funnel tapers without recomputation here. */}
          <div
            className="h-2.5 w-full overflow-hidden rounded-full"
            style={{
              background: "var(--separator-strong, rgba(148,163,184,0.16))",
            }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${step.barWidthPct}%`,
                background: "var(--accent-primary)",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * States: skeleton (loading), empty (pre-go-live), and a per-section no-data
 * note (a populated cockpit can still have one rollup not yet computed).
 * ────────────────────────────────────────────────────────────────────────── */

function CockpitSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="glass-surface h-[84px] animate-pulse rounded-xl"
            style={{ border: "1px solid var(--border-default)" }}
          />
        ))}
      </div>
      <div
        className="glass-elevated h-[300px] animate-pulse rounded-2xl"
        style={{ border: "1px solid var(--border-default)" }}
      />
      <div
        className="glass-elevated h-[220px] animate-pulse rounded-2xl"
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
        <BarChart3 size={20} style={{ color: "var(--text-secondary)" }} />
      </div>
      <p
        className="text-[14px] font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        No analytics yet
      </p>
      <p
        className="max-w-sm text-[12px] leading-snug"
        style={{ color: "var(--text-secondary)" }}
      >
        The nightly rollups populate this once tracking is live. Check back
        after the first aggregation run.
      </p>
    </div>
  );
}

function NoSeries({ label }: { label: string }) {
  return (
    <p
      className="py-8 text-center text-[12px]"
      style={{ color: "var(--text-tertiary)" }}
    >
      {label}
    </p>
  );
}
