"use client";

/**
 * ResolutionDrawer — per-party sanctions-match resolution (UI Phase 3C).
 *
 * Right-side panel that loads one party's full detail (incl. its screenings
 * with hits + 50%-rule cascade) and lets the reviewer resolve the latest
 * POTENTIAL_MATCH screening. Two outcomes, both audited via the EXISTING
 * decide route with a MANDATORY justification:
 *   - CLEAR (false positive)  → screeningStatus back to CLEAR
 *   - CONFIRMED_HIT           → blocks the party from new operations
 *
 * Resolution is ALWAYS individual: there is no bulk dismiss. Each decision
 * carries its own justification and writes decidedById/decidedAt/notes on
 * the insert-only TradeScreeningResult.
 *
 * A11y mirrors TradeCommandPalette: role="dialog" + aria-modal, Esc-to-
 * close, backdrop-click-to-close, autofocus into the justification field.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  X,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { validateResolutionReason } from "@/lib/trade/screening-triage";

interface ScreeningHit {
  list: string;
  entryId: string;
  score: number;
  matchedFields: string[];
  entryName?: string;
  entryCountry?: string;
}

interface CascadeAncestor {
  ancestorName: string;
  effectivePercent: number;
  screeningStatus: string;
}

interface LatestScreening {
  id: string;
  decision: string;
  createdAt: string;
  snapshotHash: string | null;
  hits: ScreeningHit[] | null;
  cascade: { cascadeHit?: boolean; ancestors?: CascadeAncestor[] } | null;
}

interface PartyDetail {
  id: string;
  legalName: string;
  tradeName: string | null;
  countryCode: string;
  canonicalName: string;
  leiCode: string | null;
  vatNumber: string | null;
  status: string;
  screenings: LatestScreening[];
}

interface Props {
  partyId: string;
  onClose: () => void;
  /** Called after a successful decide so the queue re-fetches. */
  onResolved: () => void;
}

export function ResolutionDrawer({ partyId, onClose, onResolved }: Props) {
  const toast = useToast();
  const [party, setParty] = useState<PartyDetail | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState<null | "CLEAR" | "CONFIRMED">(
    null,
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const [confirmArmed, setConfirmArmed] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load full detail (includes screenings w/ hits + cascade) on open.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/trade/parties/${partyId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          if (d.party) setParty(d.party as PartyDetail);
          else setLoadFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [partyId]);

  // Esc-to-close.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Modal hygiene: lock body scroll while open, restore focus to the opener
  // on close, and clear any pending confirm-arm timer.
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      trigger?.focus?.();
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    };
  }, []);

  // Focus trap: keep Tab within the dialog (WCAG 2.4.3 for aria-modal).
  function trapTab(e: ReactKeyboardEvent) {
    if (e.key !== "Tab") return;
    const root = asideRef.current;
    if (!root) return;
    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>(
        'button, [href], textarea, input, select, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hasAttribute("disabled"));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // Confirm-hit is destructive (blocks the party — reversible only by a fresh
  // screening). Require a 2nd click within 4s so a stray click can't block a
  // real customer.
  function onConfirmHit() {
    if (!confirmArmed) {
      setConfirmArmed(true);
      confirmTimer.current = setTimeout(() => setConfirmArmed(false), 4000);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirmArmed(false);
    void decide("CONFIRMED_HIT");
  }

  // The screening we decide on = latest POTENTIAL_MATCH.
  const screening =
    party?.screenings.find((s) => s.decision === "POTENTIAL_MATCH") ?? null;
  const hits = screening?.hits ?? [];
  const ancestors = screening?.cascade?.ancestors ?? [];

  const reasonValid = validateResolutionReason(notes).ok;

  async function decide(
    decision: "CONFIRMED_HIT" | "FALSE_POSITIVE_DISMISSED",
  ) {
    const v = validateResolutionReason(notes);
    if (!v.ok) {
      toast.warning("Justification required", v.error);
      textareaRef.current?.focus();
      return;
    }
    if (!screening) return;
    setSubmitting(decision === "CONFIRMED_HIT" ? "CONFIRMED" : "CLEAR");
    try {
      const res = await fetch(
        `/api/trade/parties/${partyId}/screenings/${screening.id}/decide`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ decision, notes }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          "Could not resolve",
          data.error ??
            "The screening could not be resolved. It may have been decided already.",
        );
        // A 409 (already decided by a concurrent reviewer) means the queue is
        // stale — re-fetch so the row disappears.
        if (res.status === 409) {
          onResolved();
          onClose();
        }
        return;
      }
      toast.success(
        decision === "CONFIRMED_HIT" ? "Party blocked" : "Marked clear",
        decision === "CONFIRMED_HIT"
          ? `${party?.legalName} is now BLOCKED from new operations.`
          : `${party?.legalName} returned to CLEAR.`,
      );
      onResolved();
      onClose();
    } catch {
      toast.error("Could not resolve", "Network error — please try again.");
    } finally {
      setSubmitting(null);
    }
  }

  const busy = submitting !== null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={asideRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Resolve screening match for ${party?.legalName ?? "counterparty"}`}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col overflow-y-auto border-l border-trade-border bg-trade-bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={trapTab}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-trade-border-subtle px-6 py-5">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-600">
              <ShieldAlert className="h-3.5 w-3.5" />
              Potential sanctions match
            </div>
            <h2 className="truncate text-[18px] font-bold leading-tight text-trade-text-primary">
              {party?.legalName ?? "Loading…"}
            </h2>
            {party && (
              <p className="mt-0.5 text-[12px] text-trade-text-muted">
                {party.countryCode}
                {party.tradeName ? ` · ${party.tradeName}` : ""}
                {party.status === "BLOCKED" ? " · BLOCKED" : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-trade-text-muted transition hover:bg-trade-hover hover:text-trade-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-5">
          {loadFailed && (
            <p className="text-[13px] text-trade-accent-danger">
              Could not load this counterparty. Close and try again.
            </p>
          )}

          {!loadFailed && !party && (
            <div className="flex items-center gap-2 text-[13px] text-trade-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading screening
              details…
            </div>
          )}

          {party && !screening && (
            <p className="text-[13px] text-trade-text-secondary">
              This counterparty has no open potential-match screening to
              resolve. It may have already been decided — close and refresh the
              queue.
            </p>
          )}

          {party && screening && (
            <>
              <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
                The engine auto-prepared this match. You confirm. Review the
                matched sanctioned entity against the counterparty below, then
                resolve with a justification — every decision is audit-logged.
              </p>

              {/* Side-by-side compare per hit */}
              <div className="space-y-3">
                {hits.length === 0 && (
                  <p className="text-[12px] text-trade-text-muted">
                    No individual fuzzy hits recorded
                    {screening.cascade?.cascadeHit
                      ? " — flagged by a 50%-rule ownership cascade (below)."
                      : "."}
                  </p>
                )}
                {hits.map((h, i) => (
                  <div
                    key={`${h.list}-${h.entryId}-${i}`}
                    className="rounded-lg border border-trade-border-subtle bg-trade-bg-subtle p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-700">
                        {h.list}
                      </span>
                      <span className="text-[12px] font-semibold text-trade-text-primary">
                        score {h.score.toFixed(2)}
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <div className="min-w-0">
                        <div className="text-[9px] font-semibold uppercase tracking-widest text-trade-text-muted">
                          Sanctioned entity
                        </div>
                        <div className="truncate text-[13px] text-trade-text-primary">
                          {h.entryName ?? `Entry ${h.entryId}`}
                        </div>
                        {h.entryCountry && (
                          <div className="text-[11px] text-trade-text-muted">
                            {h.entryCountry}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-trade-text-muted" />
                      <div className="min-w-0 text-right">
                        <div className="text-[9px] font-semibold uppercase tracking-widest text-trade-text-muted">
                          Counterparty
                        </div>
                        <div className="truncate text-[13px] text-trade-text-primary">
                          {party.canonicalName || party.legalName}
                        </div>
                        <div className="text-[11px] text-trade-text-muted">
                          {party.countryCode}
                          {party.leiCode ? ` · LEI ${party.leiCode}` : ""}
                        </div>
                      </div>
                    </div>
                    {h.matchedFields.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {h.matchedFields.map((f) => (
                          <span
                            key={f}
                            className="rounded bg-trade-bg-elevated px-1.5 py-0.5 text-[10px] text-trade-text-secondary ring-1 ring-trade-border-subtle"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* 50%-rule cascade chain */}
                {ancestors.length > 0 && (
                  <div className="rounded-lg border border-trade-border-subtle bg-trade-bg-subtle p-3">
                    <div className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-trade-text-muted">
                      50%-rule ownership cascade
                    </div>
                    <ul className="space-y-1">
                      {ancestors.map((a, i) => (
                        <li
                          key={`${a.ancestorName}-${i}`}
                          className="flex items-center justify-between text-[12px] text-trade-text-secondary"
                        >
                          <span className="truncate">{a.ancestorName}</span>
                          <span className="ml-2 shrink-0 text-trade-text-muted">
                            {a.effectivePercent.toFixed(1)}% ·{" "}
                            {a.screeningStatus}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Justification */}
              <label
                htmlFor="resolution-reason"
                className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-trade-text-secondary"
              >
                Justification (required)
              </label>
              <textarea
                id="resolution-reason"
                ref={textareaRef}
                autoFocus
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setConfirmArmed(false);
                }}
                maxLength={2000}
                rows={4}
                placeholder="e.g. Distinct legal entity — different country and registration number; not the sanctioned party."
                className="mt-1.5 w-full rounded-lg border border-trade-border bg-trade-bg-subtle px-3 py-2 text-[13px] text-trade-text-primary outline-none placeholder:text-trade-text-muted focus:border-trade-accent"
              />
              <div className="mt-1 text-right text-[10px] text-trade-text-muted">
                {notes.length}/2000
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        {party && screening && (
          <div className="border-t border-trade-border-subtle px-6 py-4">
            <p className="mb-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-trade-text-muted">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              Confirming a hit BLOCKS {party.legalName} from new operations.
              This is reversible only by running a fresh screening.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => decide("FALSE_POSITIVE_DISMISSED")}
                disabled={!reasonValid || busy}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-trade-border bg-trade-bg-panel px-3 py-2 text-[13px] font-semibold text-trade-text-secondary transition hover:bg-trade-hover hover:text-trade-text-primary disabled:opacity-40"
              >
                {submitting === "CLEAR" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Mark CLEAR (false positive)
              </button>
              <button
                type="button"
                onClick={onConfirmHit}
                disabled={!reasonValid || busy}
                aria-label="Confirm sanctions hit — blocks the party"
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-white transition disabled:opacity-40 ${
                  confirmArmed
                    ? "bg-red-700 ring-2 ring-red-300 ring-offset-1"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {submitting === "CONFIRMED" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldAlert className="h-4 w-4" />
                )}
                {confirmArmed
                  ? "Click again to block"
                  : "Confirm hit — blocks party"}
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
