"use client";

import * as React from "react";
import Link from "next/link";
import {
  Link2,
  Bitcoin,
  Clock,
  ChevronDown,
  Sparkles,
  Hash,
  Loader2,
} from "lucide-react";

import type {
  AuditChainBlock,
  AuditChainSegment,
} from "@/lib/comply-v2/audit-chain-view.server";
import { loadMoreAuditChainSegment } from "@/app/dashboard/audit-chain/actions";

/**
 * AuditChainVisualizer — Sprint 10A (Wow-Pattern #7)
 *
 * Renders the operator's audit-hash chain as a vertical "blockchain"
 * with each row showing its SHA-256 link to the previous block. Blocks
 * that have been anchored to Bitcoin via Sprint 8A+B show an emerald
 * (UPGRADED) or amber (PENDING) marker; verifiers can click the
 * marker to deep-link straight into the public /verify page with the
 * anchorHash pre-filled.
 *
 * # Hash truncation
 *
 * Full SHA-256 hex is 64 chars — too wide to fit alongside meta on a
 * card. We display a 12-char head + 8-char tail with a click-to-reveal
 * full hash on demand. Click anywhere on the hash to copy it.
 *
 * # Pagination
 *
 * The page server-fetches the first 50 blocks. The visualizer's "Load
 * more" button calls loadMoreAuditChainSegment via Server Action,
 * appends the result to the local state, and updates the cursor.
 */

export interface AuditChainVisualizerProps {
  organizationId: string | null;
  initialSegment: AuditChainSegment;
}

export function AuditChainVisualizer({
  organizationId,
  initialSegment,
}: AuditChainVisualizerProps) {
  const [blocks, setBlocks] = React.useState<AuditChainBlock[]>(
    initialSegment.blocks,
  );
  const [nextCursor, setNextCursor] = React.useState(initialSegment.nextCursor);
  const [hasMore, setHasMore] = React.useState(initialSegment.hasMore);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!organizationId || initialSegment.totalEntries === 0) {
    return <EmptyState />;
  }

  const anchored = blocks.filter((b) => b.anchor !== null).length;

  async function loadMore() {
    if (!organizationId || !nextCursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await loadMoreAuditChainSegment(
        organizationId,
        nextCursor,
      );
      if (!result.ok) {
        setError(`Could not load more blocks: ${result.error}`);
      } else {
        setBlocks((prev) => [...prev, ...result.segment.blocks]);
        setNextCursor(result.segment.nextCursor);
        setHasMore(result.segment.hasMore);
      }
    } catch (err) {
      setError((err as Error).message ?? "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-testid="audit-chain-visualizer" className="space-y-4">
      <SummaryBar
        totalEntries={initialSegment.totalEntries}
        loaded={blocks.length}
        anchored={anchored}
      />
      <ol data-testid="audit-chain-list" className="relative space-y-3">
        {blocks.map((block, idx) => (
          <BlockCard key={block.id} block={block} isFirst={idx === 0} />
        ))}
      </ol>
      {error ? (
        <div className="rounded-md border-l-2 border-red-500/60 bg-red-500/[0.05] p-3 text-[12px] text-red-200">
          {error}
        </div>
      ) : null}
      {hasMore ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            data-testid="load-more"
            className="inline-flex items-center gap-2 rounded bg-white/[0.04] px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-300 ring-1 ring-inset ring-white/[0.08] transition hover:bg-white/[0.08] hover:text-slate-100 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {loading ? "Loading…" : "Load older blocks"}
          </button>
        </div>
      ) : (
        <div className="pt-2 text-center font-mono text-[10px] uppercase tracking-wider text-slate-600">
          Genesis · chain start
        </div>
      )}
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────

function SummaryBar({
  totalEntries,
  loaded,
  anchored,
}: {
  totalEntries: number;
  loaded: number;
  anchored: number;
}) {
  return (
    <div
      data-testid="audit-chain-summary"
      className="palantir-surface flex flex-wrap items-center justify-between gap-3 rounded-md p-3"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">
        <span className="inline-flex items-center gap-1.5 text-slate-300">
          <Link2 className="h-3 w-3 text-emerald-400" />
          {totalEntries} blocks total
        </span>
        <span>{loaded} loaded</span>
        <span className="inline-flex items-center gap-1.5 text-emerald-300">
          <Bitcoin className="h-3 w-3" />
          {anchored} anchored
        </span>
      </div>
    </div>
  );
}

function BlockCard({
  block,
  isFirst,
}: {
  block: AuditChainBlock;
  isFirst: boolean;
}) {
  return (
    <li
      data-testid="audit-chain-block"
      data-anchored={block.anchor !== null}
      className="relative palantir-surface rounded-md p-4"
    >
      {/* Connector line down to the next block */}
      {!isFirst ? (
        <span
          aria-hidden
          className="absolute -top-3 left-6 h-3 w-px bg-white/[0.1]"
        />
      ) : null}

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm bg-emerald-500/15 font-mono text-[10px] font-bold tabular-nums text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
            #{block.index}
          </span>
          <div className="leading-tight">
            <div className="font-mono text-[11px] font-medium text-slate-200">
              {block.action}
            </div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
              {block.entityType} · {block.entityId.slice(0, 12)}
              {block.entityId.length > 12 ? "…" : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {block.anchor ? <AnchorMarker anchor={block.anchor} /> : null}
          <time
            dateTime={block.timestamp}
            className="font-mono text-[9px] uppercase tracking-wider text-slate-500"
          >
            <Clock className="mr-1 inline h-3 w-3" />
            {block.timestamp.slice(0, 19).replace("T", " ")}
          </time>
        </div>
      </header>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <HashRow label="this block" hash={block.entryHash} />
        <HashRow label="prev block" hash={block.previousHash} />
      </div>
    </li>
  );
}

function HashRow({ label, hash }: { label: string; hash: string | null }) {
  const display = hash
    ? hash.startsWith("GENESIS_")
      ? hash
      : `${hash.slice(0, 12)}…${hash.slice(-8)}`
    : "(unhashed)";
  const tone = hash
    ? hash.startsWith("GENESIS_")
      ? "text-amber-300"
      : "text-emerald-300"
    : "text-slate-600";
  return (
    <div className="flex items-center gap-1.5 rounded bg-black/30 px-2 py-1.5 ring-1 ring-inset ring-white/[0.04]">
      <Hash className="h-3 w-3 shrink-0 text-slate-500" />
      <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <code
        className={`flex-1 truncate font-mono text-[10px] tracking-tight ${tone}`}
        title={hash ?? "no hash recorded"}
      >
        {display}
      </code>
    </div>
  );
}

function AnchorMarker({
  anchor,
}: {
  anchor: NonNullable<AuditChainBlock["anchor"]>;
}) {
  const tone =
    anchor.status === "UPGRADED"
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40"
      : "bg-amber-500/15 text-amber-300 ring-amber-500/40";
  const label =
    anchor.status === "UPGRADED" && anchor.blockHeight
      ? `BTC #${anchor.blockHeight}`
      : anchor.status === "UPGRADED"
        ? "ANCHORED"
        : "PENDING";
  return (
    <Link
      href={`/verify?anchorHash=${anchor.anchorHash}`}
      data-testid="anchor-marker"
      data-status={anchor.status}
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ring-1 ring-inset transition hover:opacity-80 ${tone}`}
      title={`Verify on /verify with anchor hash ${anchor.anchorHash}`}
    >
      <Bitcoin className="h-3 w-3" />
      {label}
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="palantir-surface mx-auto max-w-md rounded-md p-12 text-center">
      <Sparkles className="mx-auto mb-3 h-5 w-5 text-emerald-400" />
      <p className="text-sm text-slate-200">No audit blocks yet</p>
      <p className="mt-2 text-xs text-slate-500">
        Once your team creates audit-tracked changes (article status updates,
        document uploads, attestations), they appear here as a tamper-evident
        chain.
      </p>
    </div>
  );
}
