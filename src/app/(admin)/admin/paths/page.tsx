"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — the PATH / flow page (Phase 4 → P2 flow viz).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Shows how users move through ONE product on its latest day with data, sourced
 * from the PII-free AnalyticsPathEdge rollup. A full dependency-free Sankey is
 * impractical (the rollup is a flat one-day edge bag with no node coordinates),
 * so this renders an HONEST source→target flow — never a list mislabelled as a
 * "Sankey":
 *
 *   • Two headline panels — "Worst drop-offs" (real pages that bleed the most
 *     sessions to (exit), with each page's drop-off rate) and "Top entry pages"
 *     (where sessions begin). These are the questions an operator actually asks.
 *   • A source-grouped flow — each source page is a header with a proportional
 *     outflow bar, and beneath it the destinations users go to, each sized as a
 *     share of THAT source's outflow ("of everyone who left /x, this share went
 *     to /y"). That is the real source→target structure a Sankey encodes, laid
 *     out as grouped bars. The "(entry)"/"(exit)" sentinels are styled distinctly
 *     so a session boundary reads as a boundary, not a real page.
 *
 * This is a THIN wrapper: ALL math (per-source grouping + shares, worst-exit /
 * top-entry rollups, drop-off rate, path shortening) lives in the pure, tested
 * helpers in ./path-data. The hook (useAdminData) owns fetch/loading/error/abort;
 * we render the four states (skeleton / inline-error / friendly-empty / data).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useMemo, useState } from "react";
import {
  ArrowRight,
  LogIn,
  LogOut,
  TrendingDown,
  DoorOpen,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminCard from "@/components/admin/AdminCard";
import ExportButton from "@/components/admin/ExportButton";
import { useAdminData } from "@/components/admin/useAdminData";
import { compactNumber, pctLabel } from "@/components/admin/format";
import type { CsvRow } from "@/components/admin/export-utils";
import type { PathsResponse } from "@/lib/admin/analytics-types";
import {
  groupOutflows,
  worstExits,
  topEntries,
  shortPathLabel,
  buildPathExport,
  PATH_EXPORT_COLUMNS,
  PATH_PRODUCTS,
  type PathProduct,
  type SourceGroup,
  type OutEdge,
  type ExitRow,
  type EntryRow,
} from "./path-data";

export default function PathsPage() {
  // The page owns the selected product; the fetch URL is derived from it so a
  // switch re-fetches (the hook aborts the prior request — last-write-wins).
  const [product, setProduct] = useState<PathProduct>("comply");
  const { data, loading, error } = useAdminData<PathsResponse>(
    `/api/admin/v2/paths?product=${product}`,
  );

  // Flatten the source-grouped flow into one row per source→destination edge
  // from the ALREADY-FETCHED edges — no extra fetch (pure + tested helper).
  const exportRows = useMemo<CsvRow[]>(
    () => (data ? buildPathExport(data.edges) : []),
    [data],
  );

  const hasEdges = !loading && !error && !!data && data.edges.length > 0;

  return (
    <>
      <AdminPageHeader
        title="Paths"
        subtitle="How users move through a product — entry pages, where they go next, and where they drop off — on its most recent active day."
        right={
          <div className="flex items-center gap-3">
            {hasEdges && (
              <ExportButton
                rows={exportRows}
                columns={PATH_EXPORT_COLUMNS}
                filename={`caelex-paths-${product}${
                  data?.date ? `-${data.date}` : ""
                }`}
                label="Export"
              />
            )}
            <ProductSwitcher value={product} onChange={setProduct} />
          </div>
        }
      />

      {loading && <PathsSkeleton />}

      {!loading && error && (
        <AdminCard>
          <InlineMessage
            tone="danger"
            text={`Could not load paths — ${error}.`}
          />
        </AdminCard>
      )}

      {!loading && !error && data && data.edges.length === 0 && (
        <AdminCard>
          <EmptyState
            title="No path data yet"
            hint="Page-to-page flows appear here once the analytics rollups have captured a day of activity for this product."
          />
        </AdminCard>
      )}

      {!loading && !error && data && data.edges.length > 0 && (
        <PathFlow data={data} />
      )}
    </>
  );
}

/**
 * The full flow view for one product's latest day of edges. Computes the three
 * pure rollups once and lays them out: the two headline panels (worst exits +
 * top entries) above the source-grouped outflow body.
 */
function PathFlow({ data }: { data: PathsResponse }) {
  // ALL derived math is computed once by the tested pure helpers — these
  // components only lay the results out.
  const exits = worstExits(data.edges);
  const entries = topEntries(data.edges);
  const groups = groupOutflows(data.edges);

  const dayLabel = data.date ? ` · ${data.date}` : "";

  return (
    <div className="space-y-4">
      {/* Headline panels: the two questions an operator actually asks. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard
          title="Worst drop-offs"
          subtitle="Real pages where sessions most often end. The rate is each page's drop-off across all the traffic leaving it."
          right={<ProductBadge product={data.product} />}
        >
          {exits.length === 0 ? (
            <MiniEmpty text="No sessions ended on a tracked page this day." />
          ) : (
            <ul className="space-y-1.5">
              {exits.map((row) => (
                <ExitRowView key={row.fromPath} row={row} />
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard
          title="Top entry pages"
          subtitle="Where sessions begin — the landing pages for this product."
        >
          {entries.length === 0 ? (
            <MiniEmpty text="No session-start pages were recorded this day." />
          ) : (
            <ul className="space-y-1.5">
              {entries.map((row) => (
                <EntryRowView key={row.toPath} row={row} />
              ))}
            </ul>
          )}
        </AdminCard>
      </div>

      {/* The source→target flow body. */}
      <AdminCard
        title="Flow by source page"
        subtitle={`Where users go from each page${dayLabel} — each destination sized by its share of that page's outflow.`}
        right={<ProductBadge product={data.product} />}
      >
        <div className="space-y-3">
          {groups.map((group) => (
            <SourceGroupView key={group.fromPath} group={group} />
          ))}
        </div>
      </AdminCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Source-grouped flow — one source page + the destinations users go to.
// ─────────────────────────────────────────────────────────────────────────────

/** A source page header (with outflow magnitude) and its proportional out-edges. */
function SourceGroupView({ group }: { group: SourceGroup }) {
  // Header bar reflects this source's outflow relative to the busiest source.
  const headerWidthPct = barPct(group.widthFrac);

  return (
    <section
      className="rounded-xl"
      style={{ border: "1px solid var(--border-default)" }}
    >
      {/* Source header: the page users are leaving FROM + its total outflow. */}
      <header className="relative overflow-hidden rounded-t-xl">
        <div
          aria-hidden
          className="absolute inset-y-0 left-0"
          style={{
            width: `${headerWidthPct}%`,
            background:
              "linear-gradient(90deg, color-mix(in srgb, var(--accent-primary) 16%, transparent), color-mix(in srgb, var(--accent-primary) 4%, transparent))",
          }}
        />
        <div className="relative flex items-center justify-between gap-3 px-3 py-2">
          <PathToken
            path={group.fromPath}
            isSentinel={group.isEntry}
            kind="entry"
          />
          <span
            className="flex-shrink-0 text-[11px] tabular-nums"
            style={{ color: "var(--text-secondary)" }}
            title="Total transitions leaving this page"
          >
            {compactNumber(group.totalOut)} out
          </span>
        </div>
      </header>

      {/* Destinations, sized by share of THIS source's outflow. */}
      <ol
        className="space-y-1 px-2.5 pb-2.5 pt-1"
        style={{ borderTop: "1px solid var(--border-default)" }}
      >
        {group.outEdges.map((edge) => (
          <OutEdgeView key={`${group.fromPath}→${edge.toPath}`} edge={edge} />
        ))}
      </ol>
    </section>
  );
}

/** One destination within a source group: arrow, target, share bar, count. */
function OutEdgeView({ edge }: { edge: OutEdge }) {
  const widthPct = barPct(edge.shareOfSource);
  // Exit destinations tint danger so an outflow-to-exit reads as a leak.
  const fillColor = edge.isExit
    ? "var(--accent-danger)"
    : "var(--accent-primary)";

  return (
    <li className="relative overflow-hidden rounded-md">
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 rounded-md transition-[width] duration-300"
        style={{
          width: `${widthPct}%`,
          background: `color-mix(in srgb, ${fillColor} 14%, transparent)`,
        }}
      />
      <div className="relative flex items-center gap-2 px-2.5 py-1.5">
        <ArrowRight
          size={12}
          aria-hidden
          className="flex-shrink-0"
          style={{ color: "var(--text-tertiary)" }}
        />
        <div className="min-w-0 flex-1">
          <PathToken path={edge.toPath} isSentinel={edge.isExit} kind="exit" />
        </div>
        <div className="flex flex-shrink-0 items-baseline gap-2">
          <span
            className="text-[12px] font-medium tabular-nums"
            style={{ color: "var(--text-primary)" }}
          >
            {compactNumber(edge.transitions)}
          </span>
          <span
            className="w-9 text-right text-[10px] tabular-nums"
            style={{ color: "var(--text-secondary)" }}
            title="Share of this page's outflow"
          >
            {pctLabel(edge.shareOfSource)}
          </span>
        </div>
      </div>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Headline rows — worst exits + top entries.
// ─────────────────────────────────────────────────────────────────────────────

/** A worst-exit row: page, danger-tinted bar, exit volume + drop-off rate. */
function ExitRowView({ row }: { row: ExitRow }) {
  const widthPct = barPct(row.widthFrac);
  return (
    <li className="relative overflow-hidden rounded-lg">
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 rounded-lg transition-[width] duration-300"
        style={{
          width: `${widthPct}%`,
          background:
            "color-mix(in srgb, var(--accent-danger) 13%, transparent)",
        }}
      />
      <div
        className="relative flex items-center gap-2.5 px-3 py-2"
        style={{ border: "1px solid var(--border-default)", borderRadius: 8 }}
      >
        <TrendingDown
          size={13}
          aria-hidden
          className="flex-shrink-0"
          style={{ color: "var(--accent-danger)" }}
        />
        <span
          className="min-w-0 flex-1 truncate text-[12px]"
          style={{ color: "var(--text-primary)" }}
          title={row.fromPath}
        >
          {shortPathLabel(row.fromPath)}
        </span>
        <div className="flex flex-shrink-0 items-baseline gap-2">
          <span
            className="text-[12px] font-semibold tabular-nums"
            style={{ color: "var(--text-primary)" }}
            title="Sessions that ended on this page"
          >
            {compactNumber(row.transitions)}
          </span>
          <span
            className="w-12 text-right text-[10px] tabular-nums"
            style={{ color: "var(--text-secondary)" }}
            title="Drop-off rate — share of this page's traffic that left the product"
          >
            {/* null rate (unknowable) → em-dash, never a misleading number. */}
            {row.exitRate == null ? "—" : `${pctLabel(row.exitRate)} exit`}
          </span>
        </div>
      </div>
    </li>
  );
}

/** A top-entry row: landing page, accent bar, entry volume + share. */
function EntryRowView({ row }: { row: EntryRow }) {
  const widthPct = barPct(row.widthFrac);
  return (
    <li className="relative overflow-hidden rounded-lg">
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 rounded-lg transition-[width] duration-300"
        style={{
          width: `${widthPct}%`,
          background:
            "color-mix(in srgb, var(--accent-primary) 13%, transparent)",
        }}
      />
      <div
        className="relative flex items-center gap-2.5 px-3 py-2"
        style={{ border: "1px solid var(--border-default)", borderRadius: 8 }}
      >
        <DoorOpen
          size={13}
          aria-hidden
          className="flex-shrink-0"
          style={{ color: "var(--accent-primary)" }}
        />
        <span
          className="min-w-0 flex-1 truncate text-[12px]"
          style={{ color: "var(--text-primary)" }}
          title={row.toPath}
        >
          {shortPathLabel(row.toPath)}
        </span>
        <div className="flex flex-shrink-0 items-baseline gap-2">
          <span
            className="text-[12px] font-semibold tabular-nums"
            style={{ color: "var(--text-primary)" }}
            title="Sessions that began on this page"
          >
            {compactNumber(row.transitions)}
          </span>
          <span
            className="w-9 text-right text-[10px] tabular-nums"
            style={{ color: "var(--text-secondary)" }}
            title="Share of all session starts"
          >
            {pctLabel(row.share)}
          </span>
        </div>
      </div>
    </li>
  );
}

/**
 * Floor a 0..1 fraction to a visible percentage width: a tiny-but-nonzero value
 * still shows a sliver of bar (min 2%); exactly 0 stays 0. Shared by every bar
 * so the empty/zero case is consistent.
 */
function barPct(frac: number): number {
  if (!Number.isFinite(frac) || frac <= 0) return 0;
  return Math.max(2, Math.round(frac * 100));
}

/**
 * A single path endpoint. The "(entry)"/"(exit)" sentinels render as a tinted
 * pill with an icon (visually distinct from a real route); a normal path renders
 * as a shortened label with the full path on hover.
 */
function PathToken({
  path,
  isSentinel,
  kind,
}: {
  path: string;
  isSentinel: boolean;
  kind: "entry" | "exit";
}) {
  if (isSentinel) {
    const Icon = kind === "entry" ? LogIn : LogOut;
    // Exit sentinels read as a leak (danger); entry sentinels as the accent.
    const color =
      kind === "exit" ? "var(--accent-danger)" : "var(--accent-primary)";
    return (
      <span
        className="inline-flex flex-shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.04em]"
        style={{
          color,
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
        }}
      >
        <Icon size={11} aria-hidden />
        {kind}
      </span>
    );
  }
  return (
    <span
      className="min-w-0 truncate text-[12px]"
      style={{ color: "var(--text-primary)" }}
      title={path}
    >
      {shortPathLabel(path)}
    </span>
  );
}

/** A small bordered pill showing the current product (header right slot). */
function ProductBadge({ product }: { product: string }) {
  return (
    <span
      className="rounded-md px-2 py-1 text-[11px] font-medium capitalize"
      style={{
        color: "var(--text-secondary)",
        border: "1px solid var(--border-default)",
      }}
    >
      {product}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Product switcher — a small segmented control over the 6 products.
//
// Inline-state hover hacks are deliberately avoided: the muted→primary hover is
// driven by a CSS `:hover` rule on the `.admin-pill` class (defined in the
// component <style> below), so a hover never mutates inline style and the active
// pill (which sets its own colour) is unaffected.
// ─────────────────────────────────────────────────────────────────────────────

function ProductSwitcher({
  value,
  onChange,
}: {
  value: PathProduct;
  onChange: (p: PathProduct) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Product"
      className="inline-flex flex-wrap items-center gap-0.5 rounded-lg p-0.5 glass-surface"
      style={{ border: "1px solid var(--border-default)" }}
    >
      <style>{`
        .admin-pill { color: var(--text-secondary); transition: color 150ms; }
        .admin-pill:hover { color: var(--text-primary); }
      `}</style>
      {PATH_PRODUCTS.map((p) => {
        const active = p === value;
        return (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(p)}
            className={`admin-pill rounded-md px-2.5 py-1 text-[12px] font-medium capitalize${
              active ? " is-active" : ""
            }`}
            style={
              active
                ? { background: "var(--accent-primary)", color: "#ffffff" }
                : undefined
            }
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Local state primitives (shared shape with the other admin pages).
// ─────────────────────────────────────────────────────────────────────────────

function PathsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((panel) => (
          <AdminCard key={panel}>
            <div className="space-y-1.5">
              {[0, 1, 2, 3].map((bar) => (
                <div
                  key={bar}
                  className="h-9 animate-pulse rounded-lg"
                  style={{
                    background: "var(--border-default)",
                    width: `${100 - bar * 14}%`,
                  }}
                />
              ))}
            </div>
          </AdminCard>
        ))}
      </div>
      <AdminCard>
        <div className="space-y-3">
          {[0, 1, 2].map((grp) => (
            <div
              key={grp}
              className="h-20 animate-pulse rounded-xl"
              style={{ background: "var(--border-default)" }}
            />
          ))}
        </div>
      </AdminCard>
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

/** A terse, single-line empty note for an individual panel (not the whole page). */
function MiniEmpty({ text }: { text: string }) {
  return (
    <p
      className="py-4 text-center text-[12px]"
      style={{ color: "var(--text-secondary)" }}
    >
      {text}
    </p>
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
