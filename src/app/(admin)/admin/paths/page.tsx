"use client";

/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — the PATH / flow page (Phase 4).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Shows the busiest page-to-page transitions for one product on its latest day
 * with data, as a ranked FLOW LIST: each row is `fromPath → toPath` with a bar
 * proportional to the busiest edge and the transition count. The "(entry)" /
 * "(exit)" session sentinels are styled distinctly so a boundary reads as a
 * boundary, not a real page. A product switcher across the 6 products drives the
 * fetch. (A full Sankey is optional polish — the ranked list is the MVP.)
 *
 * This is a THIN wrapper: the bar-width normalisation, share-of-total, sentinel
 * detection, and path-shortening all come from the pure, tested helpers in
 * ./path-data (buildPathRows / shortPathLabel / isEntry / isExit). The hook
 * (useAdminData) owns fetch/loading/error/abort; we render loading, error, and
 * empty (no edges yet — the rollups may be empty pre-go-live) states.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import { ArrowRight, LogIn, LogOut } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminCard from "@/components/admin/AdminCard";
import { useAdminData } from "@/components/admin/useAdminData";
import { compactNumber, pctLabel } from "@/components/admin/format";
import type { PathsResponse } from "@/lib/admin/analytics-types";
import {
  buildPathRows,
  shortPathLabel,
  PATH_PRODUCTS,
  type PathProduct,
  type PathEdgeRow,
} from "./path-data";

export default function PathsPage() {
  // The page owns the selected product; the fetch URL is derived from it so a
  // switch re-fetches (the hook aborts the prior request — last-write-wins).
  const [product, setProduct] = useState<PathProduct>("comply");
  const { data, loading, error } = useAdminData<PathsResponse>(
    `/api/admin/v2/paths?product=${product}`,
  );

  return (
    <>
      <AdminPageHeader
        title="Paths"
        subtitle="The busiest page-to-page transitions for a product on its most recent active day."
        right={<ProductSwitcher value={product} onChange={setProduct} />}
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
        <PathFlowCard data={data} />
      )}
    </>
  );
}

/** The ranked flow list for one product's latest day of edges. */
function PathFlowCard({ data }: { data: PathsResponse }) {
  // ALL derived math (relative width, share, sentinel flags) is computed once by
  // the tested pure helper — this component only lays it out.
  const rows = buildPathRows(data.edges);

  return (
    <AdminCard
      title="Top transitions"
      subtitle={
        data.date
          ? `${rows.length} flow${rows.length === 1 ? "" : "s"} · ${data.date}`
          : `${rows.length} flows`
      }
      right={
        <span
          className="rounded-md px-2 py-1 text-[11px] font-medium"
          style={{
            color: "var(--text-secondary)",
            border: "1px solid var(--border-default)",
          }}
        >
          {data.product}
        </span>
      }
    >
      <ol className="space-y-1.5">
        {rows.map((row, i) => (
          <PathRow
            key={`${row.fromPath}→${row.toPath}`}
            row={row}
            rank={i + 1}
          />
        ))}
      </ol>
    </AdminCard>
  );
}

/**
 * One transition edge: a rank, the `from → to` label pair (entry/exit sentinels
 * styled distinctly), a proportional bar, and the transition count + flow share.
 */
function PathRow({ row, rank }: { row: PathEdgeRow; rank: number }) {
  // Floor the visible width so a tiny-but-nonzero edge still shows a sliver of
  // bar. 0 stays 0.
  const widthPct =
    row.widthFrac <= 0 ? 0 : Math.max(2, Math.round(row.widthFrac * 100));

  return (
    <li className="relative overflow-hidden rounded-lg">
      {/* Proportional bar sits BEHIND the labels as a subtle fill, so the row
          reads like a horizontal bar with text on top (robust + legible). */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 rounded-lg transition-[width] duration-300"
        style={{
          width: `${widthPct}%`,
          background:
            "linear-gradient(90deg, color-mix(in srgb, var(--accent-primary) 22%, transparent), color-mix(in srgb, var(--accent-primary) 6%, transparent))",
        }}
      />
      <div
        className="relative flex items-center gap-3 px-3 py-2"
        style={{ border: "1px solid var(--border-default)", borderRadius: 8 }}
      >
        <span
          className="w-5 flex-shrink-0 text-right text-[11px] tabular-nums"
          style={{ color: "var(--text-secondary)" }}
        >
          {rank}
        </span>

        {/* from → to */}
        <div className="flex min-w-0 flex-1 items-center gap-2 text-[12px]">
          <PathToken
            path={row.fromPath}
            isSentinel={row.fromIsEntry}
            kind="entry"
          />
          <ArrowRight
            size={13}
            aria-hidden
            className="flex-shrink-0"
            style={{ color: "var(--text-secondary)" }}
          />
          <PathToken path={row.toPath} isSentinel={row.toIsExit} kind="exit" />
        </div>

        {/* Count + share of total flow. */}
        <div className="flex flex-shrink-0 items-baseline gap-2">
          <span
            className="text-[12px] font-semibold tabular-nums"
            style={{ color: "var(--text-primary)" }}
          >
            {compactNumber(row.transitions)}
          </span>
          <span
            className="text-[10px] tabular-nums"
            style={{ color: "var(--text-secondary)" }}
            title="Share of this product's total transitions"
          >
            {pctLabel(row.share)}
          </span>
        </div>
      </div>
    </li>
  );
}

/**
 * A single path endpoint. The "(entry)"/"(exit)" sentinels render as a tinted
 * pill with an icon (visually distinct from a real route); a normal path renders
 * as a shortened, monospace-ish label with the full path on hover.
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
    return (
      <span
        className="inline-flex flex-shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.04em]"
        style={{
          color: "var(--accent-primary)",
          background:
            "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
        }}
      >
        <Icon size={11} aria-hidden />
        {kind}
      </span>
    );
  }
  return (
    <span
      className="min-w-0 truncate"
      style={{ color: "var(--text-primary)" }}
      title={path}
    >
      {shortPathLabel(path)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Product switcher — a small segmented control over the 6 products.
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
      {PATH_PRODUCTS.map((p) => {
        const active = p === value;
        return (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(p)}
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
    <AdminCard>
      <div className="space-y-1.5">
        {[0, 1, 2, 3, 4, 5].map((bar) => (
          <div
            key={bar}
            className="h-9 animate-pulse rounded-lg"
            style={{
              background: "var(--border-default)",
              width: `${100 - bar * 12}%`,
            }}
          />
        ))}
      </div>
    </AdminCard>
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
