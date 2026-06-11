"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — the FUNNEL explorer page (Phase 4).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Renders every conversion funnel the rollup knows about for the selected range.
 * Each funnel is an AdminCard with a vertical stack of horizontal step bars: the
 * bar width is the step's entrants relative to step-0 (the funnel silhouette),
 * annotated with the step→step conversion % and the median time to the next
 * step. This file is a THIN wrapper — every number it draws comes from the pure,
 * tested helpers in ./funnel-data (conversionRatio / buildFunnelRows /
 * humaniseMs / funnelTitle); the rendering here is just layout + tokens.
 *
 * Data: GET /api/admin/v2/funnels?range=<range> → FunnelsResponse. The hook
 * (useAdminData) owns fetch/loading/error/abort; we render loading, error, and
 * empty (no funnels yet — the rollups may be empty pre-go-live) states.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useMemo, useState } from "react";
import { Filter, ArrowDownRight } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminCard from "@/components/admin/AdminCard";
import RangeTabs from "@/components/admin/RangeTabs";
import ExportButton from "@/components/admin/ExportButton";
import { useAdminData } from "@/components/admin/useAdminData";
import { compactNumber, pctLabel } from "@/components/admin/format";
import type { CsvRow } from "@/components/admin/export-utils";
import type {
  AdminRange,
  FunnelsResponse,
  FunnelView,
} from "@/lib/admin/analytics-types";
import {
  buildFunnelRows,
  buildFunnelExport,
  funnelTitle,
  FUNNEL_EXPORT_COLUMNS,
  type FunnelStepRow,
} from "./funnel-data";

export default function FunnelsPage() {
  // The page owns the range; the fetch URL is derived from it so a tab toggle
  // re-fetches (and the hook aborts the prior request — last-write-wins).
  // Stale-while-revalidate: bekannte Zeiträume erscheinen sofort aus dem Cache.
  const [range, setRange] = useState<AdminRange>("30d");
  const { data, error } = useAdminData<FunnelsResponse>(
    `/api/admin/v2/funnels?range=${range}`,
  );

  // Flatten every funnel's steps into one row-per-step CSV table from the
  // ALREADY-FETCHED response — no extra fetch (pure + tested helper).
  const exportRows = useMemo<CsvRow[]>(
    () => (data ? buildFunnelExport(data.funnels) : []),
    [data],
  );

  const hasFunnels = !!data && data.funnels.length > 0;

  return (
    <>
      <AdminPageHeader
        title="Conversion-Trichter (Funnels)"
        subtitle="Schritt-für-Schritt-Konversion in jedem Produkt-Ablauf, summiert über den gewählten Zeitraum."
        right={
          <div className="flex items-center gap-3">
            {hasFunnels && (
              <ExportButton
                rows={exportRows}
                columns={FUNNEL_EXPORT_COLUMNS}
                filename={`caelex-trichter-${range}`}
                label="Export (CSV)"
              />
            )}
            <RangeTabs value={range} onChange={setRange} />
          </div>
        }
      />

      {!data && error && (
        <AdminCard>
          <InlineMessage
            tone="danger"
            text={`Conversion-Trichter konnten nicht geladen werden — ${error}.`}
          />
        </AdminCard>
      )}

      {!data && !error && <FunnelsSkeleton />}

      {data && data.funnels.length === 0 && (
        <AdminCard>
          <EmptyState
            title="Noch keine Trichter-Daten"
            hint="Trichter erscheinen hier, sobald die Analytik-Auswertungen für diesen Zeitraum berechnet wurden."
          />
        </AdminCard>
      )}

      {data && data.funnels.length > 0 && (
        <div className="space-y-5">
          {data.funnels.map((funnel) => (
            <FunnelCard key={funnel.funnelId} funnel={funnel} />
          ))}
        </div>
      )}
    </>
  );
}

/** One funnel rendered as a card of stacked, proportional step bars. */
function FunnelCard({ funnel }: { funnel: FunnelView }) {
  // ALL derived math (relative width, conversion, ms label) is computed once,
  // up front, by the tested pure helper — this component only lays it out.
  const rows = buildFunnelRows(funnel.steps);
  const entered0 = rows.length > 0 ? rows[0].usersEntered : 0;

  return (
    <AdminCard
      title={funnelTitle(funnel)}
      subtitle={`${rows.length} Schritt${rows.length === 1 ? "" : "e"} · ${compactNumber(
        entered0,
      )} haben Schritt 1 gestartet`}
      right={
        <span
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium"
          style={{
            color: "var(--text-secondary)",
            border: "1px solid var(--border-default)",
          }}
        >
          <Filter size={12} aria-hidden />
          {funnel.product ?? "produktübergreifend"}
        </span>
      }
    >
      <ol className="space-y-2.5">
        {rows.map((row, i) => (
          <FunnelStep
            key={row.step}
            row={row}
            index={i}
            isLast={i === rows.length - 1}
          />
        ))}
      </ol>
    </AdminCard>
  );
}

/**
 * A single funnel step: a labelled, proportionally-wide bar with the entered
 * count inside it, plus a right-aligned conversion % and a "→ <time>" hop label
 * connecting it to the next step.
 */
function FunnelStep({
  row,
  index,
  isLast,
}: {
  row: FunnelStepRow;
  index: number;
  isLast: boolean;
}) {
  // Floor the visible width so a tiny-but-nonzero step still shows a sliver of
  // bar (a 0.4%-width bar would otherwise be invisible). 0 stays 0.
  const widthPct =
    row.widthFrac <= 0 ? 0 : Math.max(2, Math.round(row.widthFrac * 100));

  // Tint the conversion label by health so a leaky step is scannable at a glance.
  const conv = row.conversionPct;
  const convColor =
    conv === null
      ? "var(--text-secondary)"
      : conv >= 0.6
        ? "var(--accent-primary)"
        : conv >= 0.3
          ? "#f59e0b"
          : "var(--accent-danger)";

  return (
    <li>
      <div className="flex items-center justify-between gap-3">
        {/* Step index + key */}
        <span
          className="min-w-0 flex-shrink-0 truncate text-[12px] font-medium"
          style={{ color: "var(--text-primary)", maxWidth: "45%" }}
          title={row.stepKey}
        >
          <span style={{ color: "var(--text-secondary)" }}>{index + 1}.</span>{" "}
          {row.stepKey}
        </span>
        {/* Conversion % to the next step (undefined when nobody entered). */}
        <span
          className="flex-shrink-0 text-[12px] font-semibold tabular-nums"
          style={{ color: convColor }}
          title="Anteil der Nutzer dieses Schritts, die weitergekommen sind"
        >
          {conv === null ? "—" : pctLabel(conv)}
        </span>
      </div>

      {/* Proportional bar with the entered count overlaid. */}
      <div
        className="mt-1 h-7 w-full overflow-hidden rounded-md"
        style={{ background: "var(--bg-base, rgba(255,255,255,0.03))" }}
        role="img"
        aria-label={`${compactNumber(row.usersEntered)} gestartet, ${
          row.conversionPct === null ? "keine" : pctLabel(row.conversionPct)
        } Konversion`}
      >
        <div
          className="flex h-full items-center rounded-md px-2 transition-[width] duration-300"
          style={{
            width: `${widthPct}%`,
            minWidth: widthPct > 0 ? "2.5rem" : 0,
            // Accent-tinted fill; opacity steps down each row so the silhouette
            // reads top-heavy without needing a separate colour per step.
            background:
              "linear-gradient(90deg, color-mix(in srgb, var(--accent-primary) 70%, transparent), color-mix(in srgb, var(--accent-primary) 30%, transparent))",
          }}
        >
          <span
            className="truncate text-[11px] font-semibold tabular-nums"
            style={{ color: "var(--text-primary)" }}
          >
            {compactNumber(row.usersEntered)}
          </span>
        </div>
      </div>

      {/* Hop connector to the next step (omitted after the last/terminal row,
          which has no "next" to measure a median time to). */}
      {!isLast && (
        <div
          className="mt-1 flex items-center gap-1 pl-1 text-[10px]"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowDownRight size={11} aria-hidden />
          <span className="tabular-nums">{row.msToNextLabel}</span>
          <span>Median bis zum nächsten Schritt</span>
        </div>
      )}
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Local state primitives (shared shape with the other admin pages).
// ─────────────────────────────────────────────────────────────────────────────

/** Erststart: echte Karten, Trichter-Balken pulsieren dezent (kein Vollflächen-Loader). */
function FunnelsSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      {[0, 1].map((card) => (
        <AdminCard
          key={card}
          title={card === 0 ? "Wachstums-Trichter" : "Produkt-Trichter"}
          subtitle="Schritt-für-Schritt-Konversion"
        >
          <div className="space-y-3" role="status" aria-label="Wird geladen">
            {[0, 1, 2].map((bar) => (
              <div
                key={bar}
                className="h-7 animate-pulse rounded-md"
                style={{
                  background: "var(--separator-strong, rgba(148,163,184,0.14))",
                  width: `${100 - bar * 25}%`,
                }}
              />
            ))}
          </div>
        </AdminCard>
      ))}
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="py-10 text-center">
      <p
        className="text-[14px] font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </p>
      <p
        className="mx-auto mt-1.5 max-w-md text-[12px]"
        style={{ color: "var(--text-secondary)" }}
      >
        {hint}
      </p>
    </div>
  );
}

function InlineMessage({ tone, text }: { tone: "danger"; text: string }) {
  return (
    <p
      className="py-6 text-center text-[13px]"
      style={{
        color:
          tone === "danger" ? "var(--accent-danger)" : "var(--text-secondary)",
      }}
    >
      {text}
    </p>
  );
}
