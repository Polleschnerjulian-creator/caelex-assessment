"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — RETENTION cohort heatmap (Phase 4, page).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Weekly signup-cohort retention as a triangular heatmap: rows are cohorts
 * (signup week + size), columns are weeks-since-signup (0 = the 100% anchor),
 * and each occupied tile is the platform accent at an alpha proportional to its
 * retention pct, so the diagonal decay is legible at a glance. A segmented
 * scope switcher (all / per-product) re-fetches the grid for that scope.
 *
 * This component is a THIN renderer: it owns only the selected scope, derives
 * the fetch URL from it (useAdminData), and delegates ALL the data shaping —
 * densifying short cohort rows into a rectangular matrix and computing each
 * tile's tone — to the unit-tested {@link buildRetentionGrid} pure helper. It
 * renders the four canonical states (loading / error / empty / data) the rest
 * of the admin surface uses.
 *
 * Privacy: the API reads only the PII-free AnalyticsRetentionCohort rollup, so
 * this surface shows HOW MANY users returned per cohort, never WHO.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useMemo, useState } from "react";
import { RefreshCw, Users } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminCard from "@/components/admin/AdminCard";
import ExportButton from "@/components/admin/ExportButton";
import { useAdminData } from "@/components/admin/useAdminData";
import { compactNumber } from "@/components/admin/format";
import type { CsvRow } from "@/components/admin/export-utils";
import type { RetentionResponse } from "@/lib/admin/analytics-types";
import {
  buildRetentionGrid,
  buildRetentionExport,
  type RetentionGridCell,
} from "../retention-data";

// ─────────────────────────────────────────────────────────────────────────────
// Scope switcher — a RangeTabs-style segmented control over the scopes that
// actually have data (from the response), not a fixed list. We keep the active
// scope in the option set even before the response confirms it, so the control
// never momentarily drops the selected pill mid-fetch.
// ─────────────────────────────────────────────────────────────────────────────

function ScopeTabs({
  scopes,
  value,
  onChange,
}: {
  scopes: string[];
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Retention scope"
      className="inline-flex items-center gap-0.5 rounded-lg p-0.5 glass-surface"
      style={{ border: "1px solid var(--border-default)" }}
    >
      {scopes.map((s) => {
        const active = s === value;
        return (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(s)}
            className="rounded-md px-2.5 py-1 text-[12px] font-medium capitalize transition-colors duration-150"
            style={{
              background: active ? "var(--accent-primary)" : "transparent",
              color: active ? "#ffffff" : "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              if (!active)
                e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

// A single heatmap tile. Occupied cells show their pct (compact, on the tinted
// tile); absent slots render as an empty, faintly-outlined placeholder so the
// triangular shape of the cohort is visible without implying a 0% value.
function HeatCell({ cell }: { cell: RetentionGridCell }) {
  if (!cell.present) {
    return (
      <td className="p-0.5">
        <div
          className="h-9 w-full rounded-[5px]"
          style={{
            background: "transparent",
            border: "1px dashed var(--border-default)",
            opacity: 0.35,
          }}
          aria-hidden="true"
        />
      </td>
    );
  }
  // Week-0 (and other high-alpha tiles) get light text for contrast against the
  // saturated accent; faint tiles keep primary text on the near-dark fill.
  const strong = cell.pct >= 0.6;
  return (
    <td className="p-0.5">
      <div
        className="flex h-9 w-full items-center justify-center rounded-[5px] text-[11px] font-medium tabular-nums"
        style={{
          background: cell.tone,
          border: "1px solid var(--border-default)",
          color: strong ? "#ffffff" : "var(--text-primary)",
        }}
        title={`${cell.pctLabel} retained · week ${cell.weeksSince} · ${compactNumber(
          cell.returnedUsers,
        )} users`}
      >
        {cell.pctLabel}
      </div>
    </td>
  );
}

// A faint left-to-right legend showing the accent alpha ramp 0%→100%.
function ToneLegend() {
  const stops = [0.06, 0.25, 0.5, 0.75, 1];
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
        Less
      </span>
      <div className="flex items-center gap-1">
        {stops.map((a) => (
          <span
            key={a}
            className="h-3 w-5 rounded-[3px]"
            style={{
              background: `rgba(16, 185, 129, ${a})`,
              border: "1px solid var(--border-default)",
            }}
          />
        ))}
      </div>
      <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
        More retained
      </span>
    </div>
  );
}

export default function RetentionPage() {
  // The active scope drives the fetch URL. "all" is the default; the switcher
  // swaps it, useAdminData re-fetches + aborts the prior request.
  const [scope, setScope] = useState<string>("all");
  const url = `/api/admin/v2/retention?scope=${encodeURIComponent(scope)}`;
  const { data, loading, error, reload } = useAdminData<RetentionResponse>(url);

  // Pivot the response into a dense, column-aligned matrix (pure + tested).
  const grid = useMemo(() => (data ? buildRetentionGrid(data) : null), [data]);

  // Flatten the (triangular) cohort grid into a rectangular CSV table from the
  // ALREADY-FETCHED grid — no extra fetch. One row per cohort, week_0..week_N
  // retention percents; absent weeks stay blank (pure + tested helper).
  const csv = useMemo(
    () =>
      grid && !grid.isEmpty
        ? buildRetentionExport(grid)
        : { rows: [] as CsvRow[], columns: [] },
    [grid],
  );

  // Option set for the switcher: the scopes that have data, but always keep the
  // currently-selected scope (so a freshly-picked empty scope still shows its
  // pill) and fall back to ["all"] before the first response lands.
  const scopeOptions = useMemo(() => {
    const set = new Set<string>(data?.availableScopes ?? []);
    set.add(scope);
    if (set.size === 0) set.add("all");
    // Stable order: "all" first, then the rest alphabetically.
    return Array.from(set).sort((a, b) => {
      if (a === "all") return -1;
      if (b === "all") return 1;
      return a.localeCompare(b);
    });
  }, [data?.availableScopes, scope]);

  return (
    <div>
      <AdminPageHeader
        title="Retention"
        subtitle="Weekly signup cohorts — share of each cohort returning in the weeks after signup. Counts only; no personal data."
        right={
          <div className="flex items-center gap-3">
            {grid && !grid.isEmpty && (
              <ExportButton
                rows={csv.rows}
                columns={csv.columns}
                filename={`caelex-retention-${scope}`}
                label="Export"
              />
            )}
            <ScopeTabs
              scopes={scopeOptions}
              value={scope}
              onChange={setScope}
            />
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              aria-label="Refresh"
              className="flex h-8 w-8 items-center justify-center rounded-lg glass-surface transition-colors disabled:opacity-50"
              style={{ border: "1px solid var(--border-default)" }}
            >
              <RefreshCw
                className={loading ? "animate-spin" : ""}
                size={14}
                style={{ color: "var(--text-secondary)" }}
              />
            </button>
          </div>
        }
      />

      <AdminCard
        title="Cohort retention"
        subtitle={
          grid && !grid.isEmpty
            ? `${grid.rows.length} cohort${grid.rows.length === 1 ? "" : "s"} · up to week ${
                grid.columns[grid.columns.length - 1]
              }`
            : undefined
        }
        right={grid && !grid.isEmpty ? <ToneLegend /> : undefined}
      >
        {/* ── Loading ─────────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-9 w-full animate-pulse rounded-md glass-surface"
              />
            ))}
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────── */}
        {!loading && error && (
          <div
            className="rounded-lg px-4 py-6 text-center text-[13px]"
            style={{
              border: "1px solid var(--border-default)",
              color: "var(--accent-danger)",
            }}
          >
            Could not load retention: {error}
          </div>
        )}

        {/* ── Empty ───────────────────────────────────────────────── */}
        {!loading && !error && grid && grid.isEmpty && (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-lg px-4 py-12 text-center"
            style={{ border: "1px dashed var(--border-default)" }}
          >
            <Users size={22} style={{ color: "var(--text-secondary)" }} />
            <p
              className="text-[13px] font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              No retention data yet
            </p>
            <p
              className="text-[12px]"
              style={{ color: "var(--text-secondary)" }}
            >
              Cohorts appear here once the weekly retention rollup has run for
              this scope.
            </p>
          </div>
        )}

        {/* ── Data: the heatmap ───────────────────────────────────── */}
        {!loading && !error && grid && !grid.isEmpty && (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  {/* Sticky-ish left header for the cohort identity column. */}
                  <th
                    className="pb-2 pr-3 text-left align-bottom text-[10px] font-semibold uppercase tracking-[0.06em]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Cohort
                  </th>
                  {grid.columns.map((w) => (
                    <th
                      key={w}
                      className="px-0.5 pb-2 text-center align-bottom text-[10px] font-semibold uppercase tracking-[0.04em]"
                      style={{ color: "var(--text-secondary)" }}
                      title={`Week ${w} after signup`}
                    >
                      W{w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.rows.map((row) => (
                  <tr key={row.cohortWeek}>
                    <td className="py-0.5 pr-3 align-middle whitespace-nowrap">
                      <div
                        className="text-[12px] font-medium tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {row.cohortWeek}
                      </div>
                      <div
                        className="text-[10px] tabular-nums"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {compactNumber(row.cohortSize)} signups
                      </div>
                    </td>
                    {row.cells.map((cell) => (
                      <HeatCell key={cell.weeksSince} cell={cell} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
