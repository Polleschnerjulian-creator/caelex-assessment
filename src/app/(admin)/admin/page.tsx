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
import { AlertTriangle, BarChart3 } from "lucide-react";
import type { AdminRange } from "@/lib/admin/analytics-types";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminCard from "@/components/admin/AdminCard";
import KpiTile from "@/components/admin/KpiTile";
import RangeTabs from "@/components/admin/RangeTabs";
import ExportButton from "@/components/admin/ExportButton";
import { CardSkeleton, KpiTileSkeleton } from "@/components/admin/Skeleton";
import type { CsvRow } from "@/components/admin/export-utils";
import { useAdminData } from "@/components/admin/useAdminData";
import {
  compactNumber,
  dateDe,
  eur,
  pctLabel,
} from "@/components/admin/format";
import {
  detectAnomalies,
  describeAnomaly,
  type AnomalyFlag,
  type AnomalySeverity,
} from "@/lib/admin/anomalies";
import {
  funnelWithConversion,
  isCockpitEmpty,
  isDepthEmpty,
  formatAsOf,
  type CockpitResponseV2,
  type ProductDepthVM,
} from "./cockpit-data";

/**
 * Flatten the per-product depth view-models into export rows — product, every
 * value-event count, the screening hit-rate as a plain percent ("" when there
 * was no screening sample, mirroring the table's em-dash), the raw screening
 * volume, the AI cost, and the rolled-up outcomes total. Fed straight from the
 * page's already-fetched `perProductDepth` (no new fetch). Pure.
 */
function depthExportRows(rows: readonly ProductDepthVM[]): CsvRow[] {
  return rows.map((r) => ({
    product: r.product,
    assessments: r.assessmentsCompleted,
    classifications: r.classifications,
    // Honest blank (not "0%") when there were no screenings to rate.
    screening_hit_rate_pct:
      r.screeningHitRate === null ? "" : Math.round(r.screeningHitRate * 100),
    screenings_total: r.screeningsTotal,
    licenses_issued: r.licensesIssued,
    ai_messages: r.aiMessages,
    documents_generated: r.documentsGenerated,
    ai_cost_usd: r.aiCostUsd,
    outcomes: r.outcomes,
  }));
}

/** Stable column order + friendly headers for the depth export. */
const DEPTH_EXPORT_COLUMNS = [
  { key: "product", header: "Produkt" },
  { key: "assessments", header: "Assessments" },
  { key: "classifications", header: "Klassifizierungen" },
  { key: "screening_hit_rate_pct", header: "Screening-Trefferquote %" },
  { key: "screenings_total", header: "Screenings gesamt" },
  { key: "licenses_issued", header: "Erteilte Lizenzen" },
  { key: "ai_messages", header: "KI-Nachrichten" },
  { key: "documents_generated", header: "Erzeugte Dokumente" },
  { key: "ai_cost_usd", header: "KI-Kosten (USD)" },
  { key: "outcomes", header: "Ergebnisse" },
] as const;

export default function CockpitPage() {
  // The page owns the selected range; RangeTabs only reports changes and the
  // URL below is re-derived from it (the hook aborts the prior fetch on toggle).
  const [range, setRange] = useState<AdminRange>("30d");
  // Stale-while-revalidate: `data` is served instantly from the session cache
  // on revisits — the structured skeleton below appears only on the FIRST
  // visit of a range, never again as a full-page loader.
  const { data, error } = useAdminData<CockpitResponseV2>(
    `/api/admin/v2/cockpit?range=${range}`,
  );

  // Freshness: render the route's generatedAt as a stable "as of <date>" stamp
  // (computed hydration-safe in the helper). Only shown once data is in hand.
  const asOf = data ? formatAsOf(data.generatedAt) : null;

  // Offer a depth export only once there are real value-event rows in hand
  // (an empty dataset would just be a header line).
  const canExportDepth = !!data && !isDepthEmpty(data.perProductDepth);

  return (
    <div>
      <AdminPageHeader
        title="Cockpit"
        subtitle={
          asOf
            ? `Plattform-Überblick über alle Produkte · Stand ${dateDe(asOf) ?? asOf}`
            : "Plattform-Überblick über alle Produkte"
        }
        right={
          <div className="flex items-center gap-3">
            {canExportDepth && data && (
              <ExportButton
                rows={depthExportRows(data.perProductDepth)}
                columns={DEPTH_EXPORT_COLUMNS}
                filename={`cockpit-wertschoepfung-${range}${asOf ? `-${asOf}` : ""}`}
                label="Export (CSV)"
              />
            )}
            <RangeTabs value={range} onChange={setRange} />
          </div>
        }
      />

      {/* Fehler nur, wenn es nichts zu zeigen gibt — gecachte Daten bleiben stehen. */}
      {!data && error && (
        <AdminCard>
          <p
            className="text-[13px] leading-snug"
            style={{ color: "var(--accent-danger)" }}
          >
            Das Cockpit konnte nicht geladen werden: {error}
          </p>
        </AdminCard>
      )}

      {/* Erststart dieses Zeitraums: Struktur steht sofort, Karten laden inline. */}
      {!data && !error && <CockpitSkeleton />}

      {data && isCockpitEmpty(data) && (
        <AdminCard>
          <EmptyState />
        </AdminCard>
      )}

      {data && !isCockpitEmpty(data) && <CockpitBody data={data} />}
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

  // In-app anomaly detection over the daily series the page ALREADY has. Today
  // that is `dauTrend`; the multi-series signature scales to any TrendPoint[] we
  // later add to the payload without a new fetch. Honest thresholds (see
  // anomalies.ts) mean this fires ONLY on a genuine deviation of the latest day
  // from its trailing baseline — otherwise the strip renders nothing.
  const anomalies = detectAnomalies([{ metric: "DAU", series: dauTrend }]);

  return (
    <div className="flex flex-col gap-5">
      {/* Anomaly strip — only present when something is genuinely off. */}
      {anomalies.length > 0 && <AnomalyStrip flags={anomalies} />}

      {/* Revenue headline — MRR + NRR, or an honest empty state. */}
      <RevenueHeadline revenue={revenue} />

      {/* KPI row — 3 point-in-time + 3 range-summed stats. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile
          label="Täglich aktiv (DAU)"
          value={compactNumber(kpis.dau)}
          sub="Nutzer am letzten Tag"
        />
        <KpiTile
          label="Wöchentlich aktiv (WAU)"
          value={compactNumber(kpis.wau)}
          sub="Nutzer der letzten 7 Tage"
        />
        <KpiTile
          label="Monatlich aktiv (MAU)"
          value={compactNumber(kpis.mau)}
          sub="Nutzer der letzten 30 Tage"
        />
        <KpiTile
          label="Registrierungen"
          value={compactNumber(kpis.signups)}
          sub="neue Konten im Zeitraum"
        />
        <KpiTile
          label="Seitenaufrufe"
          value={compactNumber(kpis.pageViews)}
          sub="im Zeitraum"
        />
        <KpiTile
          label="Umsatz (gebucht)"
          value={eur(kpis.revenue)}
          // Booked financial-entry revenue for the range — distinct from the
          // plan-priced MRR headline above. Neutral tone on a true €0 so an empty
          // FinancialEntry table never reads as a green "success".
          sub="im Zeitraum verbuchte Einnahmen"
          tone={kpis.revenue > 0 ? "positive" : "default"}
        />
      </div>

      {/* Depth by product — REAL value-events from authoritative domain tables. */}
      <AdminCard
        title="Wertschöpfung pro Produkt"
        subtitle="Echte Ergebnis-Ereignisse in diesem Zeitraum — aus den Fachdaten der Produkte, nicht aus Seitenaufrufen"
      >
        {isDepthEmpty(perProductDepth) ? (
          <NoSeries label="In diesem Zeitraum wurden noch keine Ergebnis-Ereignisse erfasst." />
        ) : (
          <ProductDepthTable rows={perProductDepth} />
        )}
      </AdminCard>

      {/* DAU trend sparkline. */}
      <AdminCard
        title="Verlauf: Täglich aktive Nutzer"
        subtitle="Aktive Nutzer pro Tag im gewählten Zeitraum"
      >
        {dauTrend.length > 0 ? (
          <DauTrendChart points={dauTrend} />
        ) : (
          <NoSeries label="Für diesen Zeitraum liegen noch keine Tagesdaten vor." />
        )}
      </AdminCard>

      {/* Usage by product — order preserved from the API. */}
      <AdminCard
        title="Nutzung pro Produkt"
        subtitle="Aktivität in den sechs Produktbereichen"
      >
        {perProduct.length > 0 ? (
          <ProductUsageTable rows={perProduct} />
        ) : (
          <NoSeries label="Für diesen Zeitraum wurde noch keine Produkt-Nutzung erfasst." />
        )}
      </AdminCard>

      {/* Growth funnel — entrants per step + step-to-step conversion. */}
      <AdminCard
        title="Wachstums-Trichter"
        subtitle="Aktuellster produktübergreifender Einstiegs-Trichter (Onboarding)"
      >
        {funnel.length > 0 ? (
          <GrowthFunnel steps={funnel} />
        ) : (
          <NoSeries label="Noch kein Trichter-Schnappschuss berechnet." />
        )}
      </AdminCard>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Anomaly strip — a compact, HONEST callout at the top of the cockpit that
 * surfaces a genuine deviation of the latest day from its trailing baseline
 * ("⚠ DAU down 38% vs the trailing 7-day average"). Computed entirely from data
 * the page already fetched (anomalies.ts, pure + unit-tested); rendered only
 * when `detectAnomalies` returns ≥1 flag, so a normal day shows nothing.
 * Severity tints the accent (info → primary, warning → amber, critical → red).
 * ────────────────────────────────────────────────────────────────────────── */

/** Map a flag's severity to a token-driven accent + soft background pair. */
function severityTokens(severity: AnomalySeverity): {
  accent: string;
  soft: string;
} {
  switch (severity) {
    case "critical":
      return {
        accent: "var(--accent-danger)",
        soft: "var(--accent-danger-soft)",
      };
    case "warning":
      return {
        accent: "var(--accent-warning)",
        soft: "var(--accent-warning-soft)",
      };
    default:
      return {
        accent: "var(--accent-primary)",
        soft: "var(--accent-primary-soft)",
      };
  }
}

function AnomalyStrip({ flags }: { flags: AnomalyFlag[] }) {
  // The most-severe flag drives the strip's border accent (list is pre-sorted
  // most-notable-first by detectAnomalies).
  const lead = severityTokens(flags[0].severity);

  return (
    <section
      className="glass-elevated rounded-2xl p-4"
      style={{ border: `1px solid ${lead.accent}`, background: lead.soft }}
      // A live region so a screen reader announces a newly-surfaced anomaly.
      role="status"
      aria-live="polite"
      aria-label={`${flags.length} ${flags.length === 1 ? "Auffälligkeit" : "Auffälligkeiten"} erkannt`}
    >
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle
          size={15}
          aria-hidden="true"
          style={{ color: lead.accent }}
        />
        <h2
          className="text-[12px] font-semibold uppercase tracking-[0.06em]"
          style={{ color: "var(--text-primary)" }}
        >
          {flags.length === 1
            ? "Auffälligkeit erkannt"
            : `${flags.length} Auffälligkeiten erkannt`}
        </h2>
      </div>
      <ul className="flex flex-col gap-1.5">
        {flags.map((flag) => {
          const t = severityTokens(flag.severity);
          return (
            <li
              key={`${flag.metric}-${flag.date}`}
              className="flex items-center gap-2 text-[13px] leading-snug"
              style={{ color: "var(--text-secondary)" }}
            >
              <span
                className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{ background: t.accent }}
                aria-hidden="true"
              />
              {/* compactNumber for the flat-baseline fallback figure so a big
                  latest value reads as "1.2k", consistent with the KPI tiles. */}
              <span>{describeAnomaly(flag, 7, compactNumber)}</span>
              <span
                className="tabular-nums text-[11px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                · {dateDe(flag.date) ?? flag.date}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
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
        title="Umsatz"
        subtitle={
          revenue.asOf
            ? `Wiederkehrender Umsatz zu Plan-Preisen · Stand ${dateDe(revenue.asOf) ?? revenue.asOf}`
            : "Wiederkehrender Umsatz zu Plan-Preisen"
        }
      >
        <p
          className="py-6 text-center text-[12px] leading-snug"
          style={{ color: "var(--text-tertiary)" }}
        >
          Noch kein wiederkehrender Umsatz erfasst. Sobald Abrechnungsdaten
          vorliegen, erscheinen hier MRR und NRR.
        </p>
      </AdminCard>
    );
  }

  return (
    <AdminCard
      title="Umsatz"
      subtitle={
        revenue.asOf
          ? `Wiederkehrender Umsatz zu Plan-Preisen · Stand ${dateDe(revenue.asOf) ?? revenue.asOf}`
          : "Wiederkehrender Umsatz zu Plan-Preisen"
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <KpiTile
          label="Monatl. wiederkehrender Umsatz (MRR)"
          value={eur(revenue.mrr)}
          sub="Summe aller aktiven Abos pro Monat"
          tone="positive"
        />
        <KpiTile
          label="Netto-Umsatzbindung (NRR)"
          value={revenue.nrr === null ? "—" : pctLabel(revenue.nrr)}
          sub="Umsatz aus Bestandskunden vs. Vorperiode — ab 100% wächst der Bestand"
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
            <Th className="text-left">Produkt</Th>
            <Th className="text-right">Assessments</Th>
            <Th className="text-right">Klassifizierungen</Th>
            <Th className="text-right">Screening-Treffer</Th>
            <Th className="text-right">Lizenzen</Th>
            <Th className="text-right">KI-Nachrichten</Th>
            <Th className="text-right">Dokumente</Th>
            <Th className="text-right">KI-Kosten</Th>
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
                      von {compactNumber(row.screeningsTotal)}
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
            <Th className="text-left">Produkt</Th>
            <Th className="text-right">Funktionen</Th>
            <Th className="text-right">Max. Nutzer/Tag</Th>
            <Th className="text-right">Aktionen</Th>
            <Th className="text-right">Ø Verweildauer</Th>
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
                  : `${row.avgDwellSecs.toFixed(1).replace(".", ",")} s`}
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
              {compactNumber(step.usersEntered)} gestartet
              <span style={{ color: "var(--text-tertiary)" }}>
                {" · "}
                {pctLabel(step.conversion)} abgeschlossen
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

/**
 * Erststart-Zustand: die ECHTE Seitenstruktur (KPI-Raster + Karten mit
 * deutschen Titeln) steht sofort — nur die Datenflächen pulsieren dezent.
 * Kein Vollflächen-Loader; Folgebesuche kommen ohnehin sofort aus dem Cache.
 */
function CockpitSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <CardSkeleton
        title="Umsatz"
        subtitle="Wiederkehrender Umsatz zu Plan-Preisen"
        rows={2}
        rowHeight={20}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <KpiTileSkeleton key={i} />
        ))}
      </div>
      <CardSkeleton
        title="Wertschöpfung pro Produkt"
        subtitle="Echte Ergebnis-Ereignisse in diesem Zeitraum"
        rows={4}
      />
      <CardSkeleton
        title="Verlauf: Täglich aktive Nutzer"
        subtitle="Aktive Nutzer pro Tag im gewählten Zeitraum"
        rows={5}
      />
      <CardSkeleton
        title="Nutzung pro Produkt"
        subtitle="Aktivität in den sechs Produktbereichen"
        rows={4}
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
        Noch keine Analytik-Daten
      </p>
      <p
        className="max-w-sm text-[12px] leading-snug"
        style={{ color: "var(--text-secondary)" }}
      >
        Die nächtlichen Auswertungen füllen diese Ansicht, sobald das Tracking
        live ist. Nach dem ersten Auswertungslauf einfach wieder vorbeischauen.
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
