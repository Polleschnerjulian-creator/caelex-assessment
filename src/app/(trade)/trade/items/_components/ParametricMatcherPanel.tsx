"use client";

/**
 * ParametricMatcherPanel — Sprint Z3n.
 *
 * Renders the output of the parametric control-list cross-walk matcher
 * (`classifyTradeItemParametric`) for a TradeItem detail view. Surfaces
 * all four result lanes from the matcher engine:
 *
 *   1. Candidates       — full matches with confidence (HIGH/MEDIUM/LOW)
 *   2. Possible matches — partial matches blocked by NULL attributes
 *                          (operator must populate to resolve)
 *   3. Near-misses      — almost matched, single boundary refute
 *                          (operator can correct the spec)
 *   4. Empty-bag prompt — when no parametric attributes populated
 *
 * The panel renders entirely client-side. The matcher is a pure
 * function (no Prisma, no I/O), so we run it in-browser on the item
 * snapshot passed by the parent — no extra round-trip. The bridge
 * service `classifyTradeItemParametric` (Sprint Z3l) abstracts the
 * marshalling from Prisma columns to the matcher's ItemAttributeBag.
 *
 * Trade light theme tokens — uses the same `--trade-*` palette as
 * the sibling ClassificationPanel so it sits visually in the page.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useMemo, useState } from "react";
import {
  Target,
  HelpCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

import {
  classifyTradeItemParametric,
  type TradeItemParametricSnapshot,
} from "@/lib/trade/item-parametric-classification";

// ─── Component ──────────────────────────────────────────────────────

export interface ParametricMatcherPanelProps {
  item: TradeItemParametricSnapshot;
}

export function ParametricMatcherPanel({ item }: ParametricMatcherPanelProps) {
  const result = useMemo(() => classifyTradeItemParametric(item), [item]);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <section className="rounded-lg border border-trade-border-subtle bg-trade-bg-panel p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-trade-accent" strokeWidth={2} />
            <h2 className="font-display text-[14px] font-semibold tracking-[-0.005em] text-trade-text-primary">
              Parametric Cross-Walk Matcher
            </h2>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-trade-text-muted">
            Engine output from the typed technical-attribute predicates. Always
            treat as <em>screening-level guidance</em> — final classification
            requires human compliance-officer review.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowDetails((s) => !s)}
          className="shrink-0 rounded-md p-1.5 text-trade-text-muted transition hover:bg-trade-hover hover:text-trade-text-primary"
          aria-label={showDetails ? "Hide details" : "Show details"}
        >
          {showDetails ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </header>

      {result.noAttributesPopulated && <EmptyBagPrompt />}

      {!result.noAttributesPopulated && (
        <div className="space-y-4">
          <CandidatesSection result={result} />
          <PossibleMatchesSection
            possibles={result.possibleMatches}
            expanded={showDetails}
          />
          <NearMissesSection
            nearMisses={result.nearMisses}
            expanded={showDetails}
          />
        </div>
      )}

      <footer className="mt-4 border-t border-trade-border-subtle pt-3">
        <p className="text-[10px] leading-relaxed text-trade-text-muted">
          {result.disclaimer}
        </p>
      </footer>
    </section>
  );
}

// ─── Sections ───────────────────────────────────────────────────────

function EmptyBagPrompt() {
  return (
    <div className="rounded-md border border-trade-border-subtle bg-trade-bg-subtle p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
          strokeWidth={2}
        />
        <div>
          <p className="text-[12px] font-semibold text-trade-text-primary">
            No parametric attributes populated
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-trade-text-secondary">
            Populate at least one technical attribute (aperture, payload, range,
            Isp, ΔV, total impulse, radiation tolerance, item class, or
            "specially designed") to run the matcher. The engine performs
            three-valued logic — missing attributes cannot be silently treated
            as below threshold.
          </p>
        </div>
      </div>
    </div>
  );
}

function CandidatesSection({
  result,
}: {
  result: ReturnType<typeof classifyTradeItemParametric>;
}) {
  if (result.candidates.length === 0) {
    return (
      <div className="rounded-md border border-trade-border-subtle bg-trade-bg-subtle p-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-trade-text-muted" strokeWidth={2} />
          <p className="text-[12px] font-medium text-trade-text-secondary">
            No definite matches against the cross-walk seed.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-trade-text-secondary">
        <Target className="h-3.5 w-3.5" strokeWidth={2} />
        Candidates ({result.candidates.length})
      </h3>
      <div className="space-y-2">
        {result.candidates.map((c) => (
          <div
            key={c.entry.canonicalId}
            className="rounded-md border border-trade-border-subtle bg-trade-bg-subtle p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <code className="text-[11px] font-semibold text-trade-text-primary">
                  {c.entry.canonicalId}
                </code>
                <ConfidenceBadge confidence={c.confidence} />
              </div>
              <span className="text-[10px] uppercase tracking-[0.1em] text-trade-text-muted">
                {c.entry.regime}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-trade-text-secondary">
              {c.entry.title}
            </p>
            <p className="mt-1.5 text-[10px] italic leading-relaxed text-trade-text-muted">
              {c.rationale}
            </p>
            {c.entry.notes && (
              <div className="mt-2 rounded border-l-2 border-amber-500 bg-amber-50 px-2 py-1.5">
                <p className="text-[10px] leading-relaxed text-amber-900">
                  {c.entry.notes}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PossibleMatchesSection({
  possibles,
  expanded,
}: {
  possibles: ReturnType<typeof classifyTradeItemParametric>["possibleMatches"];
  expanded: boolean;
}) {
  if (possibles.length === 0) return null;
  const visible = expanded ? possibles : possibles.slice(0, 3);
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-trade-text-secondary">
        <HelpCircle className="h-3.5 w-3.5" strokeWidth={2} />
        Possible matches — populate to confirm ({possibles.length})
      </h3>
      <div className="space-y-2">
        {visible.map((p) => (
          <div
            key={p.entry.canonicalId}
            className="rounded-md border border-amber-200 bg-amber-50 p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <code className="text-[11px] font-semibold text-amber-900">
                {p.entry.canonicalId}
              </code>
              <span className="text-[10px] uppercase tracking-[0.1em] text-amber-700">
                {p.unknownPredicates.length} missing
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-900">
              {p.entry.title}
            </p>
            <p className="mt-1.5 text-[10px] italic leading-relaxed text-amber-700">
              Populate:{" "}
              {p.unknownPredicates.map((u) => u.missingAttribute).join(", ")}
            </p>
          </div>
        ))}
        {!expanded && possibles.length > 3 && (
          <p className="text-[10px] text-trade-text-muted">
            …and {possibles.length - 3} more (expand panel to see all).
          </p>
        )}
      </div>
    </div>
  );
}

function NearMissesSection({
  nearMisses,
  expanded,
}: {
  nearMisses: ReturnType<typeof classifyTradeItemParametric>["nearMisses"];
  expanded: boolean;
}) {
  if (nearMisses.length === 0) return null;
  const visible = expanded ? nearMisses : nearMisses.slice(0, 3);
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-trade-text-secondary">
        <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
        Near-misses — almost matched ({nearMisses.length})
      </h3>
      <div className="space-y-2">
        {visible.map((nm) => (
          <div
            key={nm.entry.canonicalId}
            className="rounded-md border border-trade-border-subtle bg-trade-bg-subtle p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <code className="text-[11px] font-semibold text-trade-text-primary">
                {nm.entry.canonicalId}
              </code>
              <span className="text-[10px] uppercase tracking-[0.1em] text-trade-text-muted">
                {nm.matchedPredicates.length} ✓ · 1 ✗
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-trade-text-secondary">
              {nm.entry.title}
            </p>
            <div className="mt-2 rounded border-l-2 border-red-500 bg-red-50 px-2 py-1.5">
              <p className="text-[10px] leading-relaxed text-red-900">
                <strong>{nm.refutingPredicate.attribute}</strong>{" "}
                {nm.refutingPredicate.op}{" "}
                {formatValue(nm.refutingPredicate.expectedValue)} — got{" "}
                <strong>{formatValue(nm.refutingPredicate.actualValue)}</strong>
              </p>
            </div>
          </div>
        ))}
        {!expanded && nearMisses.length > 3 && (
          <p className="text-[10px] text-trade-text-muted">
            …and {nearMisses.length - 3} more (expand panel to see all).
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function ConfidenceBadge({
  confidence,
}: {
  confidence: "HIGH" | "MEDIUM" | "LOW";
}) {
  const styles: Record<typeof confidence, string> = {
    HIGH: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200",
    MEDIUM: "bg-amber-100 text-amber-900 ring-1 ring-amber-200",
    LOW: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${styles[confidence]}`}
    >
      {confidence}
    </span>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return `[${v.join(", ")}]`;
  if (typeof v === "number") {
    if (Math.abs(v) > 0 && Math.abs(v) < 0.001) return v.toExponential(1);
    return String(v);
  }
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}
