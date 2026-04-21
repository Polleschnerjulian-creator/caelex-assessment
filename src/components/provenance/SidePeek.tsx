"use client";

/**
 * SidePeek — floating panel that opens when a user clicks a
 * ProvenanceChip. Shows the full derivation record for ONE trace:
 * origin + description + sourceRef + derivation timestamp + AI
 * confidence + upstream provenance chain.
 *
 * Design:
 *   - Right-side slide-in panel, 400px wide on desktop, full-width on
 *     small screens.
 *   - Closes on: ESC, click backdrop, close button.
 *   - Upstream items are clickable — caller passes onNavigate(traceId)
 *     to swap the panel content to the parent trace.
 *
 * Data:
 *   Fetches from GET /api/organization/profile/traces/:traceId when
 *   `open && traceId`. Cache-busts on traceId change. No SWR / React
 *   Query dependency — the trace is immutable once written, so a simple
 *   fetch-once-per-id is enough.
 */

import { useEffect, useState } from "react";
import { X, ArrowUpRight, AlertTriangle, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getTrustToken, isTraceStale } from "@/lib/design/trust-tokens";

// ─── Types (mirror the API wire shape) ─────────────────────────────────

export interface TraceDTO {
  id: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  value: unknown;
  origin: string;
  sourceRef: Record<string, unknown> | null;
  confidence: number | null;
  modelVersion: string | null;
  derivedAt: string; // ISO
  expiresAt: string | null; // ISO
  upstreamTraceIds: string[];
}

interface SidePeekProps {
  /** When null → peek closed. When non-null → fetch + show. */
  traceId: string | null;
  onClose: () => void;
  /** Called when an upstream chip is clicked — lets the host replace the
   *  active traceId so the panel pivots to that ancestor. */
  onNavigate?: (traceId: string) => void;
  /** Bypass the network fetch — use this trace + upstream directly.
   *  Intended for previews, storybooks, and unit tests. Production
   *  code should use `traceId` alone. */
  initialData?: { trace: TraceDTO; upstream: TraceDTO[] };
}

// ─── Component ─────────────────────────────────────────────────────────

export function SidePeek({
  traceId,
  onClose,
  onNavigate,
  initialData,
}: SidePeekProps) {
  const { t, language } = useLanguage();
  const [trace, setTrace] = useState<TraceDTO | null>(
    initialData?.trace ?? null,
  );
  const [upstream, setUpstream] = useState<TraceDTO[]>(
    initialData?.upstream.filter((x) => x.id !== initialData.trace.id) ?? [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const open = traceId !== null;

  // Fetch whenever traceId changes to a non-null value — UNLESS the
  // caller handed us `initialData`, which is the preview/test path.
  useEffect(() => {
    if (!traceId) {
      setTrace(null);
      setUpstream([]);
      setError(null);
      return;
    }

    if (initialData) {
      // Preview/test — render the supplied data directly, no fetch.
      setTrace(initialData.trace);
      setUpstream(
        initialData.upstream.filter((x) => x.id !== initialData.trace.id),
      );
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/organization/profile/traces/${encodeURIComponent(traceId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: { trace: TraceDTO; upstream: TraceDTO[] }) => {
        if (cancelled) return;
        setTrace(data.trace);
        // Exclude the trace itself from the upstream list — the walk
        // includes it as index 0, but we render it as the panel header.
        setUpstream(data.upstream.filter((x) => x.id !== data.trace.id));
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load trace");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [traceId, initialData]);

  // ESC closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleCopyTraceId = async () => {
    if (!trace) return;
    try {
      await navigator.clipboard.writeText(trace.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be blocked — silently ignore; UI still looks fine.
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — click to close. Separate from panel so the panel
              can be click-through-safe for its own elements. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/20 dark:bg-black/40 z-40"
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            role="dialog"
            aria-modal="true"
            aria-label={t("provenance.view_trace")}
            className="fixed top-0 right-0 bottom-0 w-full max-w-[420px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              aria-label={t("common.close")}
              className="absolute top-3 right-3 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex-1 overflow-y-auto p-5 pt-14">
              {loading && (
                <div className="flex items-center justify-center py-10 text-slate-400">
                  Loading…
                </div>
              )}

              {error && (
                <div className="flex flex-col items-start gap-2 text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <p className="text-slate-600 dark:text-slate-300">{error}</p>
                </div>
              )}

              {!loading && !error && trace && (
                <SidePeekContent
                  trace={trace}
                  upstream={upstream}
                  language={language}
                  t={t}
                  copied={copied}
                  onCopyTraceId={handleCopyTraceId}
                  onNavigate={onNavigate}
                />
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Content (extracted for readability) ───────────────────────────────

function SidePeekContent(props: {
  trace: TraceDTO;
  upstream: TraceDTO[];
  language: string;
  t: (k: string) => string;
  copied: boolean;
  onCopyTraceId: () => void;
  onNavigate?: (id: string) => void;
}) {
  const { trace, upstream, language, t, copied, onCopyTraceId, onNavigate } =
    props;
  const token = getTrustToken(trace.origin);
  const Icon = token.icon;
  const stale = isTraceStale(trace.expiresAt);
  const label = t(token.i18n.labelKey);
  const description = t(token.i18n.descriptionKey);

  return (
    <div className="space-y-5 text-sm">
      {/* Header */}
      <header
        className={`rounded-lg border p-3 ${token.colors.chipBg} ${token.colors.chipBorder} ${token.colors.chipText}`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${token.colors.iconAccent}`} />
          <h2 className="font-semibold tracking-tight">{label}</h2>
        </div>
        <p className="mt-1 text-xs opacity-80">{description}</p>
      </header>

      {/* Identity */}
      <section>
        <h3 className="text-micro uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
          Field
        </h3>
        <div className="flex items-center justify-between gap-2">
          <code className="text-xs font-mono text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
            {trace.entityType}.{trace.fieldName}
          </code>
          <ValueBadge value={trace.value} />
        </div>
      </section>

      {/* Metadata grid */}
      <section>
        <h3 className="text-micro uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
          Metadata
        </h3>
        <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-xs">
          <MetaRow
            label={t("provenance.derived_on")}
            value={fmtDate(trace.derivedAt, language)}
          />
          {trace.expiresAt && (
            <MetaRow
              label="Expires"
              value={fmtDate(trace.expiresAt, language)}
              tone={stale ? "warning" : "default"}
            />
          )}
          {trace.confidence !== null && (
            <MetaRow
              label={t("provenance.confidence")}
              value={`${Math.round(trace.confidence * 100)}%`}
            />
          )}
          {trace.modelVersion && (
            <MetaRow label={t("provenance.model")} value={trace.modelVersion} />
          )}
        </dl>
      </section>

      {/* Source ref */}
      <section>
        <h3 className="text-micro uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
          {t("provenance.source")}
        </h3>
        <SourceRefPanel sourceRef={trace.sourceRef} />
      </section>

      {/* Upstream chain */}
      {upstream.length > 0 && (
        <section>
          <h3 className="text-micro uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
            Upstream ({upstream.length})
          </h3>
          <ol className="space-y-1.5">
            {upstream.map((u) => (
              <li key={u.id}>
                <UpstreamItem
                  trace={u}
                  onNavigate={onNavigate}
                  language={language}
                  labelFor={(o) => t(getTrustToken(o).i18n.labelKey)}
                />
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Footer actions */}
      <footer className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <button
          onClick={onCopyTraceId}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-500" /> Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" /> {t("provenance.trace_id")}
            </>
          )}
        </button>
        <span className="font-mono text-[10px] text-slate-400 truncate">
          {trace.id}
        </span>
      </footer>
    </div>
  );
}

// ─── Small building blocks ─────────────────────────────────────────────

function MetaRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <>
      <dt className="text-slate-500 dark:text-slate-400 col-span-1">{label}</dt>
      <dd
        className={`col-span-2 ${tone === "warning" ? "text-amber-600 dark:text-amber-400" : "text-slate-700 dark:text-slate-200"}`}
      >
        {value}
      </dd>
    </>
  );
}

function ValueBadge({ value }: { value: unknown }) {
  const text =
    value === null || value === undefined
      ? "null"
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

  return (
    <code className="text-xs font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded max-w-[200px] truncate">
      {text}
    </code>
  );
}

function SourceRefPanel({
  sourceRef,
}: {
  sourceRef: Record<string, unknown> | null;
}) {
  if (!sourceRef) {
    return (
      <p className="text-xs text-slate-400 italic">No source ref attached</p>
    );
  }
  return (
    <dl className="grid grid-cols-3 gap-x-3 gap-y-1 text-xs">
      {Object.entries(sourceRef).map(([k, v]) => (
        <MetaRow
          key={k}
          label={k}
          value={
            v === null
              ? "null"
              : typeof v === "object"
                ? JSON.stringify(v)
                : String(v)
          }
        />
      ))}
    </dl>
  );
}

function UpstreamItem({
  trace,
  onNavigate,
  language,
  labelFor,
}: {
  trace: TraceDTO;
  onNavigate?: (id: string) => void;
  language: string;
  labelFor: (origin: string) => string;
}) {
  const token = getTrustToken(trace.origin);
  const Icon = token.icon;
  const canNavigate = !!onNavigate;

  const body = (
    <>
      <Icon className={`w-3 h-3 flex-shrink-0 ${token.colors.iconAccent}`} />
      <span className="truncate flex-1 min-w-0">
        <span className="font-mono text-xs">{trace.fieldName}</span>
        <span className="ml-1 text-slate-400 text-[10px]">
          {labelFor(trace.origin)} · {fmtDate(trace.derivedAt, language)}
        </span>
      </span>
      {canNavigate && <ArrowUpRight className="w-3 h-3 text-slate-400" />}
    </>
  );

  const classes =
    "w-full flex items-center gap-2 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors";

  return canNavigate ? (
    <button
      type="button"
      onClick={() => onNavigate!(trace.id)}
      className={classes}
    >
      {body}
    </button>
  ) : (
    <div className={classes}>{body}</div>
  );
}

function fmtDate(iso: string, lang: string): string {
  try {
    return new Intl.DateTimeFormat(lang, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default SidePeek;
