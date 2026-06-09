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
  ShieldAlert,
  Check,
  Loader2,
} from "lucide-react";

import {
  classifyTradeItemParametric,
  type TradeItemParametricSnapshot,
} from "@/lib/trade/item-parametric-classification";
import { fieldForCanonicalId } from "@/lib/trade/auto-classify-on-create";
import type { CandidateMatch } from "@/lib/comply-v2/trade/classification/parametric-matcher";
import { explainClassification } from "@/lib/comply-v2/trade/explain-classification";
import { ExplainedPanel } from "@/components/trade/ExplainedPanel";

// ─── Component ──────────────────────────────────────────────────────

export interface ParametricMatcherPanelProps {
  item: TradeItemParametricSnapshot;
  /** TradeItem id — enables the one-click "Übernehmen" (apply candidate) PATCH. */
  itemId?: string;
  /** Called after a candidate is applied so the parent can reload the item. */
  onApplied?: () => void;
}

export function ParametricMatcherPanel({
  item,
  itemId,
  onApplied,
}: ParametricMatcherPanelProps) {
  const result = useMemo(() => classifyTradeItemParametric(item), [item]);
  // Explanation Envelope over the matcher result (WHAT/WHY/WHEREFORE/
  // CONFIDENCE/SOURCE/OVERRIDE). Rendered through <ExplainedPanel>, which
  // REFUSES to display an incomplete envelope — so a classification verdict
  // can never reach the operator without its full reasoning. A no-match maps
  // to UNVERIFIED (never a clearance), the fail-closed legal invariant.
  const explained = useMemo(() => explainClassification(result), [result]);
  const [showDetails, setShowDetails] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  // One-click apply of a matcher candidate. Conservative by design: this is a
  // SUGGESTION pending review (ASTRA_SUGGESTED + REQUIRES_REVIEW), never a
  // binding human classification — mirrors auto-classify-on-create. The
  // operator confirms it fully in Edit mode (→ USER_DECLARED / CLASSIFIED).
  async function applyCandidate(c: CandidateMatch) {
    if (!itemId) return;
    const field = fieldForCanonicalId(c.entry.canonicalId);
    if (!field) return;
    const code = c.entry.canonicalId.slice(
      c.entry.canonicalId.indexOf(":") + 1,
    );
    setApplyError(null);
    setApplying(c.entry.canonicalId);
    try {
      const res = await fetch(`/api/trade/items/${itemId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          [field]: code,
          classificationSource: "ASTRA_SUGGESTED",
          status: "REQUIRES_REVIEW",
        }),
      });
      if (!res.ok) {
        setApplyError("Übernehmen fehlgeschlagen. Bitte erneut versuchen.");
        return;
      }
      onApplied?.();
    } catch {
      setApplyError("Netzwerkfehler beim Übernehmen.");
    } finally {
      setApplying(null);
    }
  }

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
          {/* Explanation Envelope — the enforcement boundary. The matcher
              verdict is surfaced ONLY through <ExplainedPanel>, which withholds
              an incomplete envelope. A no-candidate result renders UNVERIFIED
              (amber, never green) — absence is not a clearance. */}
          <ExplainedPanel result={explained} kind="Classification" />
          {/* Sprint Z3r — Elevate see-through-rule warnings to a
              prominent banner above all sections. The amber inline
              note on the entry is easy to miss; ITAR § 123.1(b) is
              high-cost-of-mistake and deserves top-of-panel visibility. */}
          <SeeThroughBanner candidates={result.candidates} />
          <CandidatesSection
            result={result}
            canApply={!!itemId}
            applying={applying}
            applyError={applyError}
            onApply={applyCandidate}
          />
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

/**
 * Sprint Z3r — See-through warning banner.
 *
 * The ITAR § 123.1(b) see-through rule is the highest-cost-of-mistake
 * regulatory boundary in the whole cross-walk (USML jurisdiction
 * carries across BOM boundaries with NO de minimis carve-out). The
 * per-candidate amber note is easy to miss; this banner elevates the
 * warning to top-of-panel red.
 *
 * Detection: any candidate whose `entry.notes` field references the
 * see-through rule or § 123.1(b). The 9A515.x-rw, USML XV(b),
 * USML XV(e)(13), and USML XV(e)(17) entries all carry these notes
 * by design.
 */
function SeeThroughBanner({ candidates }: { candidates: CandidateMatch[] }) {
  const seeThroughCandidates = candidates.filter((c) =>
    containsSeeThroughWarning(c.entry.notes),
  );
  if (seeThroughCandidates.length === 0) return null;

  const ids = seeThroughCandidates.map((c) => c.entry.canonicalId).join(", ");

  return (
    <div role="alert" className="trade-chip-danger rounded-md border-2 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert
          className="mt-0.5 h-5 w-5 shrink-0 text-current"
          strokeWidth={2}
        />
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.1em]">
            ITAR see-through rule applies
          </p>
          <p className="mt-1 text-[11px] leading-relaxed">
            One or more candidate classifications trigger the see-through rule
            under <strong>22 CFR § 123.1(b)</strong>: ITAR jurisdiction
            propagates across BOM boundaries with{" "}
            <strong>no de minimis carve-out</strong>. Host products
            incorporating these items become ITAR-controlled throughout; removal
            is a "retransfer" requiring DDTC authorization.
          </p>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em]">
            Applies to: <code className="font-mono">{ids}</code>
          </p>
          <p className="mt-2 text-[10px] italic leading-relaxed">
            Mandatory compliance officer review before any export or re-export
            action. Do not proceed on engine output alone.
          </p>
        </div>
      </div>
    </div>
  );
}

function containsSeeThroughWarning(notes: string | undefined): boolean {
  if (!notes) return false;
  return (
    /see-through/i.test(notes) ||
    /§\s*123\.1\(b\)/.test(notes) ||
    /retransfer/i.test(notes)
  );
}

function EmptyBagPrompt() {
  return (
    <div className="rounded-md border border-trade-border-subtle bg-trade-bg-subtle p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-trade-accent-warn"
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
  canApply,
  applying,
  applyError,
  onApply,
}: {
  result: ReturnType<typeof classifyTradeItemParametric>;
  canApply: boolean;
  applying: string | null;
  applyError: string | null;
  onApply: (c: CandidateMatch) => void;
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
      {applyError && (
        <p className="mb-2 text-[11px] text-trade-accent-danger">
          {applyError}
        </p>
      )}
      <div className="space-y-2">
        {result.candidates.map((c) => {
          const mappable =
            canApply && fieldForCanonicalId(c.entry.canonicalId) !== null;
          const isApplying = applying === c.entry.canonicalId;
          return (
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
                <div className="trade-chip-warn mt-2 rounded border-l-2 px-2 py-1.5">
                  <p className="text-[10px] leading-relaxed">{c.entry.notes}</p>
                </div>
              )}
              {mappable && (
                <div className="mt-2.5 flex items-center justify-end gap-2">
                  <span className="text-[9px] uppercase tracking-[0.1em] text-trade-text-muted">
                    als Vorschlag (Review) übernehmen
                  </span>
                  <button
                    type="button"
                    onClick={() => onApply(c)}
                    disabled={applying !== null}
                    className="inline-flex items-center gap-1.5 rounded-md border border-trade-border bg-trade-bg-panel px-2.5 py-1 text-[11px] font-medium text-trade-text-secondary transition hover:bg-trade-hover hover:text-trade-text-primary disabled:opacity-50"
                  >
                    {isApplying ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    Übernehmen
                  </button>
                </div>
              )}
            </div>
          );
        })}
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
            className="trade-chip-warn rounded-md border p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <code className="text-[11px] font-semibold">
                {p.entry.canonicalId}
              </code>
              <span className="text-[10px] uppercase tracking-[0.1em]">
                {p.unknownPredicates.length} missing
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed">{p.entry.title}</p>
            <p className="mt-1.5 text-[10px] italic leading-relaxed">
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
            <div className="mt-2 rounded border-l-2 border-trade-accent-danger px-2 py-1.5 trade-chip-danger">
              <p className="text-[10px] leading-relaxed">
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
    HIGH: "trade-chip-success",
    MEDIUM: "trade-chip-warn",
    LOW: "trade-chip-neutral",
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
