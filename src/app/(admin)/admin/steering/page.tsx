"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Steering — the founder-home / PMF screen (the North-Star surface).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The ONE screen that drives roadmap + spend: "which product / jurisdiction /
 * regulation do I double down on, and where do users drop off?". Fed by
 * GET /api/admin/v2/steering ({@link SteeringResponse}).
 *
 * Sections, top to bottom:
 *   1. North-Star hero — the big WACO number (weighted Weekly Active Compliance
 *      Outcomes) + active tenants + WoW/MoM trend, with a per-product
 *      contribution breakdown.
 *   2. PMF traction matrix — a product × jurisdiction heatmap (weighted-outcome
 *      intensity) so the densest, fastest-growing cell is visually obvious.
 *   3. Friction map — per-product core-flow completion bars, worst-leak first.
 *
 * Loading → skeleton; error → inline message; empty (no outcomes this week) →
 * a friendly explainer. This component is a THIN renderer — every number comes
 * from the unit-tested pure helpers in `steering-data.ts`; nothing is computed,
 * randomised, or hard-coded here.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { ArrowDownRight, ArrowUpRight, Compass, Minus } from "lucide-react";
import type {
  SteeringResponse,
  ProductContribution,
  PmfMatrix,
  FrictionRow,
} from "@/lib/admin/steering-data";
import { isSteeringEmpty } from "@/lib/admin/steering-data";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminCard from "@/components/admin/AdminCard";
import { useAdminData } from "@/components/admin/useAdminData";
import { compactNumber, pctLabel } from "@/components/admin/format";

/** The platform accent (#4a62e8) as an "r,g,b" triple — CSS custom properties
 * can't be interpolated into an rgba() alpha, so the heatmap keeps the channel
 * values here (one source of truth; mirrors the retention grid). */
const ACCENT_RGB = "74, 98, 232" as const;
/** Floor a non-zero heat cell's alpha so a faint-but-real cell stays visible. */
const MIN_CELL_ALPHA = 0.08;

export default function SteeringPage() {
  const { data, loading, error } = useAdminData<SteeringResponse>(
    "/api/admin/v2/steering",
  );

  return (
    <div>
      <AdminPageHeader
        title="Steering"
        subtitle="North-Star outcomes, product-market fit, and where users drop off"
        right={
          data && !loading && !error ? (
            <span
              className="text-[11px] tabular-nums"
              style={{ color: "var(--text-tertiary)" }}
            >
              as of {data.asOf} · trailing 7 days
            </span>
          ) : undefined
        }
      />

      {loading && <SteeringSkeleton />}

      {!loading && error && (
        <AdminCard>
          <p
            className="text-[13px] leading-snug"
            style={{ color: "var(--accent-danger)" }}
          >
            Could not load steering: {error}
          </p>
        </AdminCard>
      )}

      {!loading && !error && data && isSteeringEmpty(data) && (
        <AdminCard>
          <EmptyState />
        </AdminCard>
      )}

      {!loading && !error && data && !isSteeringEmpty(data) && (
        <SteeringBody data={data} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Body — the populated steering screen. Split out so the top-level component
 * reads as a clean state machine (loading / error / empty / body).
 * ────────────────────────────────────────────────────────────────────────── */

function SteeringBody({ data }: { data: SteeringResponse }) {
  const { northStar, pmf, friction } = data;

  return (
    <div className="flex flex-col gap-5">
      <NorthStarHero data={northStar} />

      <AdminCard
        title="Product-market fit"
        subtitle="Weighted compliance outcomes by product × jurisdiction (this week)"
      >
        {pmf.cells.length > 0 ? (
          <PmfHeatmap matrix={pmf} />
        ) : (
          <NoSeries label="No product × jurisdiction outcomes recorded this week." />
        )}
      </AdminCard>

      <AdminCard
        title="Friction map"
        subtitle="Core-flow completion by product — worst-leaking flow first"
      >
        {friction.length > 0 ? (
          <FrictionList rows={friction} />
        ) : (
          <NoSeries label="No core-flow activity to measure this week." />
        )}
      </AdminCard>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * North-Star hero — the headline WACO number, active tenants, WoW/MoM trend,
 * and a per-product weighted-contribution breakdown.
 * ────────────────────────────────────────────────────────────────────────── */

function NorthStarHero({ data }: { data: SteeringResponse["northStar"] }) {
  // Only show products that actually contributed this week (a zero row would
  // be noise in the hero); the per-product empty states live below in PMF.
  const contributing = data.perProduct.filter((p) => p.rawOutcomes > 0);

  return (
    <AdminCard>
      <div className="flex flex-col gap-6">
        {/* Headline block. */}
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <p
              className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em]"
              style={{ color: "var(--text-secondary)" }}
            >
              <Compass size={13} style={{ color: "var(--accent-primary)" }} />
              North Star · Weekly Active Compliance Outcomes
            </p>
            <div className="mt-2 flex items-end gap-3">
              <span
                className="text-[44px] font-semibold leading-none tabular-nums"
                style={{ color: "var(--text-primary)" }}
              >
                {compactNumber(data.wacoWeighted)}
              </span>
              <span className="mb-1 flex items-center gap-2">
                <TrendChip change={data.wowChange} suffix="WoW" />
                <TrendChip change={data.momChange} suffix="MoM" />
              </span>
            </div>
            <p
              className="mt-2 text-[12px] leading-snug"
              style={{ color: "var(--text-secondary)" }}
            >
              {compactNumber(data.wacoRawOutcomes)} regulatory outcome
              {data.wacoRawOutcomes === 1 ? "" : "s"} ·{" "}
              {compactNumber(data.activeTenants)} active tenant
              {data.activeTenants === 1 ? "" : "s"} · product-weighted
            </p>
          </div>

          {/* Secondary stats, right-aligned. */}
          <div className="flex gap-6">
            <HeroStat
              label="Raw outcomes"
              value={compactNumber(data.wacoRawOutcomes)}
            />
            <HeroStat
              label="Active tenants"
              value={compactNumber(data.activeTenants)}
            />
          </div>
        </div>

        {/* Per-product weighted contribution bars. */}
        {contributing.length > 0 && (
          <div>
            <p
              className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.06em]"
              style={{ color: "var(--text-secondary)" }}
            >
              Contribution by product
            </p>
            <ProductContributions rows={contributing} />
          </div>
        )}
      </div>
    </AdminCard>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p
        className="text-[10px] font-medium uppercase tracking-[0.06em]"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </p>
      <p
        className="mt-1 text-[20px] font-semibold leading-none tabular-nums"
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </p>
    </div>
  );
}

/** A signed trend chip: ↑ green / ↓ red / "new" when there is no prior baseline
 * (null) / flat when exactly 0. The `change` is a 0-centred ratio (0.5 = +50%). */
function TrendChip({
  change,
  suffix,
}: {
  change: number | null;
  suffix: string;
}) {
  if (change === null) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
        style={{
          color: "var(--text-tertiary)",
          background: "var(--separator-strong)",
        }}
        title={`No prior-week baseline (${suffix})`}
      >
        new
      </span>
    );
  }
  const up = change > 0;
  const flat = change === 0;
  const color = flat
    ? "var(--text-tertiary)"
    : up
      ? "var(--accent-success)"
      : "var(--accent-danger)";
  const bg = flat
    ? "var(--separator-strong)"
    : up
      ? "var(--accent-success-soft)"
      : "var(--accent-danger-soft)";
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums"
      style={{ color, background: bg }}
      title={`${suffix}: ${up ? "+" : ""}${pctLabel(change)}`}
    >
      <Icon size={12} />
      {up ? "+" : ""}
      {pctLabel(change)}
      <span style={{ opacity: 0.7 }}>{suffix}</span>
    </span>
  );
}

function ProductContributions({ rows }: { rows: ProductContribution[] }) {
  // Bars are relative to the busiest product's weighted contribution so the
  // leader reads as a full bar and the rest taper. Guard the empty/zero case.
  const maxWeighted = rows.reduce(
    (m, r) => (r.weighted > m ? r.weighted : m),
    0,
  );
  // Already filtered to contributing rows; sort heaviest-first for the list.
  const sorted = [...rows].sort((a, b) => b.weighted - a.weighted);

  return (
    <ul className="flex flex-col gap-2.5">
      {sorted.map((row) => (
        <li key={row.product}>
          <div className="mb-1 flex items-center justify-between gap-3">
            <span
              className="text-[12px] font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {row.label}
            </span>
            <span
              className="flex-shrink-0 text-[12px] tabular-nums"
              style={{ color: "var(--text-secondary)" }}
            >
              {compactNumber(row.weighted)}
              <span style={{ color: "var(--text-tertiary)" }}>
                {" · "}
                {compactNumber(row.rawOutcomes)} outcome
                {row.rawOutcomes === 1 ? "" : "s"} ·{" "}
                {compactNumber(row.tenants)} tenant
                {row.tenants === 1 ? "" : "s"}
              </span>
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
                width: `${maxWeighted > 0 ? (row.weighted / maxWeighted) * 100 : 0}%`,
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
 * PMF traction matrix — a product (rows) × jurisdiction (cols) heatmap. Each
 * cell's alpha encodes its share of the busiest cell's weighted outcomes, so
 * the densest land-and-expand wedge is visually obvious. Empty intersections
 * render as a faint dash. The axes come pre-ranked from the API.
 * ────────────────────────────────────────────────────────────────────────── */

function PmfHeatmap({ matrix }: { matrix: PmfMatrix }) {
  const { products, jurisdictions, cells } = matrix;

  // Index occupied cells for O(1) lookup, and find the heat anchor (busiest).
  const byKey = new Map<string, (typeof cells)[number]>();
  let maxWeighted = 0;
  for (const c of cells) {
    byKey.set(`${c.product}|${c.jurisdiction}`, c);
    if (c.weighted > maxWeighted) maxWeighted = c.weighted;
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-separate" style={{ borderSpacing: "4px" }}>
        <thead>
          <tr>
            <th className="sticky left-0" />
            {jurisdictions.map((j) => (
              <th
                key={j}
                className="px-1 pb-1 text-[11px] font-medium uppercase tracking-[0.04em]"
                style={{ color: "var(--text-secondary)" }}
                scope="col"
              >
                {j}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            return (
              <tr key={product}>
                <th
                  className="pr-2 text-right text-[12px] font-medium capitalize"
                  style={{ color: "var(--text-primary)" }}
                  scope="row"
                >
                  {productLabel(product)}
                </th>
                {jurisdictions.map((j) => {
                  const cell = byKey.get(`${product}|${j}`);
                  return (
                    <td key={j} className="p-0">
                      <HeatCell
                        weighted={cell?.weighted ?? 0}
                        rawOutcomes={cell?.rawOutcomes ?? 0}
                        tenants={cell?.tenants ?? 0}
                        wowGrowth={cell?.wowGrowth ?? null}
                        product={productLabel(product)}
                        jurisdiction={j}
                        maxWeighted={maxWeighted}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p
        className="mt-3 text-[11px] leading-snug"
        style={{ color: "var(--text-tertiary)" }}
      >
        Cell intensity = share of the busiest cell&apos;s weighted outcomes.
        Hover a cell for outcomes, tenants, and week-over-week growth.
      </p>
    </div>
  );
}

function HeatCell({
  weighted,
  rawOutcomes,
  tenants,
  wowGrowth,
  product,
  jurisdiction,
  maxWeighted,
}: {
  weighted: number;
  rawOutcomes: number;
  tenants: number;
  wowGrowth: number | null;
  product: string;
  jurisdiction: string;
  maxWeighted: number;
}) {
  const occupied = weighted > 0;
  // Alpha proportional to share of the max, floored so a faint-but-real cell
  // stays visible. Empty cells get no fill (a dash) so we never imply 0 = data.
  const share = maxWeighted > 0 ? weighted / maxWeighted : 0;
  const alpha = occupied ? Math.max(MIN_CELL_ALPHA, Math.min(1, share)) : 0;
  const growthLabel =
    wowGrowth === null
      ? "new"
      : `${wowGrowth > 0 ? "+" : ""}${pctLabel(wowGrowth)} WoW`;

  return (
    <div
      className="flex h-12 w-16 flex-col items-center justify-center rounded-md"
      style={{
        background: occupied
          ? `rgba(${ACCENT_RGB}, ${alpha})`
          : "var(--separator-strong)",
        border: "1px solid var(--border-default)",
      }}
      title={
        occupied
          ? `${product} · ${jurisdiction}: ${compactNumber(rawOutcomes)} outcomes, ${compactNumber(tenants)} tenants, ${growthLabel}`
          : `${product} · ${jurisdiction}: no outcomes this week`
      }
    >
      {occupied ? (
        <>
          <span
            className="text-[13px] font-semibold leading-none tabular-nums"
            style={{
              color: alpha > 0.45 ? "#ffffff" : "var(--text-primary)",
            }}
          >
            {compactNumber(weighted)}
          </span>
          <span
            className="mt-0.5 text-[10px] leading-none tabular-nums"
            style={{
              color:
                alpha > 0.45 ? "rgba(255,255,255,0.8)" : "var(--text-tertiary)",
            }}
          >
            {compactNumber(tenants)}t
          </span>
        </>
      ) : (
        <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          —
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Friction map — per-product core-flow completion bars. The bar is the
 * completion rate; the worst-leaking flow (lowest completion) is highlighted in
 * red so the founder sees where to invest in the flow.
 * ────────────────────────────────────────────────────────────────────────── */

function FrictionList({ rows }: { rows: FrictionRow[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row, i) => {
        // The first row is the worst leak (API sorts worst-first); flag it red.
        const worst = i === 0;
        const barColor = worst
          ? "var(--accent-danger)"
          : "var(--accent-primary)";
        return (
          <li key={`${row.product}-${row.flowLabel}`}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span
                className="text-[12px] font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {row.label}
                <span
                  className="ml-2 font-normal"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {row.flowLabel}
                </span>
              </span>
              <span
                className="flex-shrink-0 text-[12px] tabular-nums"
                style={{
                  color: worst
                    ? "var(--accent-danger)"
                    : "var(--text-secondary)",
                }}
              >
                {pctLabel(row.completionRate)} completed
                <span style={{ color: "var(--text-tertiary)" }}>
                  {" · "}
                  {compactNumber(row.completed)}/{compactNumber(row.started)} ·{" "}
                  {compactNumber(row.dropped)} dropped
                </span>
              </span>
            </div>
            <div
              className="h-2.5 w-full overflow-hidden rounded-full"
              style={{
                background: "var(--separator-strong, rgba(148,163,184,0.16))",
              }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round(row.completionRate * 100)}%`,
                  background: barColor,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Small helpers + states.
 * ────────────────────────────────────────────────────────────────────────── */

/** Capitalise the product slug to its display name. "trade" → "Passage" is the
 * brand mapping; everything else is a simple capitalise. Kept tiny + local so
 * the page stays self-contained (the canonical map lives in value-events.ts,
 * but importing a server-safe constant here keeps the bundle lean). */
function productLabel(product: string): string {
  if (product === "trade") return "Passage";
  return product.charAt(0).toUpperCase() + product.slice(1);
}

function SteeringSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <div
        className="glass-elevated h-[180px] animate-pulse rounded-2xl"
        style={{ border: "1px solid var(--border-default)" }}
      />
      <div
        className="glass-elevated h-[260px] animate-pulse rounded-2xl"
        style={{ border: "1px solid var(--border-default)" }}
      />
      <div
        className="glass-elevated h-[200px] animate-pulse rounded-2xl"
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
        <Compass size={20} style={{ color: "var(--text-secondary)" }} />
      </div>
      <p
        className="text-[14px] font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        No compliance outcomes this week
      </p>
      <p
        className="max-w-sm text-[12px] leading-snug"
        style={{ color: "var(--text-secondary)" }}
      >
        WACO counts real regulatory outcomes — assessments completed, items
        classified, licences issued, drafts produced, submissions filed. As soon
        as a tenant produces one this week, it appears here.
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
