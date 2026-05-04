import Link from "next/link";
import {
  History,
  Bitcoin,
  Hash,
  Clock,
  CircleDot,
  CheckCircle2,
  Sparkles,
  Pencil,
  Upload,
  ShieldCheck,
} from "lucide-react";

import type {
  ProvenanceEvent,
  ProvenanceTimeline as ProvenanceTimelineData,
} from "@/lib/comply-v2/provenance.server";

/**
 * ProvenanceTimeline — Sprint 10C (Wow-Pattern #8)
 *
 * Vertical lifecycle timeline for one ComplianceItem. Each
 * AuditLog row is one event card; events whose audit row has been
 * Bitcoin-anchored show a green BTC#height marker that deep-links
 * into the public /verify page with the anchorHash pre-filled.
 *
 * # Why server-rendered (no "use client")
 *
 * The timeline is read-only — no interactivity beyond the verify
 * deep-link. Server-rendering keeps the bundle small and lets the
 * timeline live inside server-rendered item-detail pages with no
 * extra hydration.
 *
 * # Action → icon mapping
 *
 * The same audit `action` string is used across V1 + V2. We map
 * common ones to expressive icons (status-change, upload, etc.)
 * and fall back to a neutral CircleDot for unknown actions.
 */

export interface ProvenanceTimelineProps {
  data: ProvenanceTimelineData;
  /** Optional title override. Defaults to "Provenance timeline". */
  title?: string;
}

export function ProvenanceTimeline({
  data,
  title = "Provenance timeline",
}: ProvenanceTimelineProps) {
  if (data.totalEvents === 0) {
    return (
      <section
        data-testid="provenance-timeline-empty"
        className="palantir-surface rounded-md p-6"
      >
        <header className="mb-2 inline-flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
          <History className="h-3 w-3 text-emerald-400" />
          {title}
        </header>
        <p className="text-[12px] text-slate-500">
          No lifecycle events yet. Events appear here as you change status,
          upload evidence, attest, or re-attest this item.
        </p>
      </section>
    );
  }

  return (
    <section
      data-testid="provenance-timeline"
      className="palantir-surface rounded-md p-4"
    >
      <header className="mb-3 flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div className="inline-flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-300">
          <History className="h-3 w-3 text-emerald-400" />
          {title}
        </div>
        <div className="inline-flex items-center gap-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">
          <span data-testid="provenance-event-count">
            {data.totalEvents} event{data.totalEvents === 1 ? "" : "s"}
          </span>
          <span
            data-testid="provenance-anchored-count"
            className="inline-flex items-center gap-1 text-emerald-300"
          >
            <Bitcoin className="h-3 w-3" />
            {data.anchoredCount} anchored
          </span>
        </div>
      </header>

      <ol className="relative space-y-3">
        {data.events.map((event, idx) => (
          <EventRow
            key={event.id}
            event={event}
            isFirst={idx === 0}
            isLast={idx === data.events.length - 1}
          />
        ))}
      </ol>
    </section>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────

const ACTION_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  article_status_changed: CircleDot,
  document_uploaded: Upload,
  attested: CheckCircle2,
  evidence_uploaded: Upload,
  note_added: Pencil,
  reviewed: ShieldCheck,
};

function EventRow({
  event,
  isFirst,
  isLast,
}: {
  event: ProvenanceEvent;
  isFirst: boolean;
  isLast: boolean;
}) {
  const Icon = ACTION_ICONS[event.action] ?? Sparkles;
  const truncatedHash = event.entryHash
    ? `${event.entryHash.slice(0, 8)}…${event.entryHash.slice(-6)}`
    : null;
  return (
    <li
      data-testid="provenance-event"
      data-anchored={event.anchor !== null}
      className="relative flex gap-3 pl-2"
    >
      {/* Vertical connector line */}
      {!isLast ? (
        <span
          aria-hidden
          className="absolute bottom-0 left-[10px] top-7 w-px bg-white/[0.08]"
        />
      ) : null}

      <div
        className={`relative z-10 mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${
          event.anchor
            ? "bg-emerald-500/20 ring-emerald-500/40"
            : "bg-white/[0.05] ring-white/[0.1]"
        }`}
      >
        <Icon
          className={`h-3 w-3 ${event.anchor ? "text-emerald-300" : "text-slate-400"}`}
        />
      </div>

      <div className="min-w-0 flex-1 rounded-md bg-white/[0.02] p-3 ring-1 ring-inset ring-white/[0.04]">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-mono text-[11px] font-medium text-slate-200">
              {event.action.replace(/_/g, " ")}
            </h3>
            <time
              dateTime={event.timestamp}
              className="font-mono text-[9px] uppercase tracking-wider text-slate-500"
            >
              <Clock className="mr-1 inline h-3 w-3" />
              {event.timestamp.slice(0, 19).replace("T", " ")}
            </time>
          </div>
          {event.anchor ? <AnchorBadge anchor={event.anchor} /> : null}
        </header>

        {event.description ? (
          <p className="mt-1 text-[12px] leading-relaxed text-slate-400">
            {event.description}
          </p>
        ) : null}

        {truncatedHash ? (
          <div
            className="mt-2 inline-flex items-center gap-1 rounded bg-black/30 px-2 py-1 ring-1 ring-inset ring-white/[0.04]"
            title={event.entryHash ?? undefined}
          >
            <Hash className="h-2.5 w-2.5 text-slate-500" />
            <code className="font-mono text-[9px] tracking-tight text-emerald-300">
              {truncatedHash}
            </code>
          </div>
        ) : null}
      </div>
      {/* isFirst marker — visually emphasise the most recent event */}
      {isFirst ? null : null}
    </li>
  );
}

function AnchorBadge({
  anchor,
}: {
  anchor: NonNullable<ProvenanceEvent["anchor"]>;
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
      data-testid="provenance-anchor-badge"
      data-status={anchor.status}
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ring-1 ring-inset transition hover:opacity-80 ${tone}`}
      title={`Verify on /verify with anchor hash ${anchor.anchorHash}`}
    >
      <Bitcoin className="h-3 w-3" />
      {label}
    </Link>
  );
}
