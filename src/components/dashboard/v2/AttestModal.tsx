"use client";

/**
 * Sprint UF29 (P0-B) — Replace `window.prompt()` for "Mark as attested".
 *
 * Audit finding P0-B: ComplianceItemCard.tsx used a native browser
 * prompt() to capture the evidence summary. Three problems:
 *
 *   1. UX is 1990s-era; breaks the dark-cinema design language.
 *   2. <10-char silent abort with no toast — user wonders why nothing
 *      happened.
 *   3. Cannot capture optional co-signer or additional notes — only
 *      a single text field. Not audit-grade.
 *
 * AttestModal is the proper replacement. Built on the existing v2
 * Dialog primitive (used by Nis2PhaseSubmitDialog, HelpDrawer, etc.)
 * for visual + behavioral consistency. Three fields:
 *
 *   - Evidence summary (required, ≥10 chars) — what proves this
 *     compliance state? auditor reads this first.
 *   - Co-signer email (optional) — second-pair-of-eyes who reviewed
 *     the attestation. for orgs with 4-eyes policies, this lands in
 *     the audit log alongside the actor.
 *   - Additional notes (optional) — anything else the operator wants
 *     to capture (e.g. "evidence packet ID 2026-Q1-NIS2-A12 in vault").
 *
 * # Why a separate component vs inline form
 *
 * The existing inline form had to use form.elements + window.prompt
 * because of how server-actions consume FormData. A modal lets us
 * collect rich state with proper React controls and submit cleanly.
 * The wrapping form-with-action is preserved so the server-action
 * pipeline (incl. CSRF, audit-log, optimistic update) stays intact.
 *
 * # Future enhancement points
 *
 *   - File upload (link to existing /api/documents/upload-url endpoint).
 *     Deferred — needs R2 + signed-URL integration that's larger scope.
 *   - "Co-signer must accept via email" workflow (Sprint Network E*).
 *
 * # Accessibility
 *
 *   - First focus lands on the evidence-summary textarea (auto-focus).
 *   - ESC closes via Radix Dialog default.
 *   - Submit button disabled until min-char threshold is met (live
 *     remaining-char counter visible to the user — no silent abort).
 */

import * as React from "react";
import { ShieldCheck, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/v2/dialog";
import { markAttestedAction } from "@/app/dashboard/today/server-actions";

const MIN_SUMMARY_LENGTH = 10;
const MAX_SUMMARY_LENGTH = 1000;
const MAX_NOTES_LENGTH = 2000;

export function AttestModal({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    /** ComplianceItem cross-regime ID (e.g. "NIS2:cl9k2j8…"). */
    id: string;
    /** Regulation label shown to the user (e.g. "NIS2 Directive"). */
    regulationLabel: string;
    /** Requirement identifier (e.g. "Art. 7", "DM-12"). */
    requirementId: string;
  };
}) {
  const [summary, setSummary] = React.useState("");
  const [coSigner, setCoSigner] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  // Reset state when dialog closes so the next open is clean.
  React.useEffect(() => {
    if (!open) {
      // Defer reset by one tick so the closing animation doesn't
      // visually flicker the field values back to empty.
      const t = setTimeout(() => {
        setSummary("");
        setCoSigner("");
        setNotes("");
        setServerError(null);
        setSubmitting(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Validation. Email is loosely matched — server enforces strict
  // validation. Empty is OK (optional field).
  const summaryTrimmed = summary.trim();
  const summaryValid = summaryTrimmed.length >= MIN_SUMMARY_LENGTH;
  const summaryRemaining = MIN_SUMMARY_LENGTH - summaryTrimmed.length;
  const coSignerValid =
    coSigner.trim().length === 0 || /^.+@.+\..+$/.test(coSigner.trim());
  const canSubmit = summaryValid && coSignerValid && !submitting;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setServerError(null);

    // Compose the rationale that lands in the audit log + proposal
    // engine. Includes co-signer + notes when set so the audit trail
    // has the full attestation context, not just the evidence summary.
    const rationaleParts = [
      `User-initiated attestation. Evidence: ${summaryTrimmed.slice(0, 500)}`,
    ];
    if (coSigner.trim()) {
      rationaleParts.push(`Co-signer: ${coSigner.trim()}`);
    }
    if (notes.trim()) {
      rationaleParts.push(`Notes: ${notes.trim().slice(0, 500)}`);
    }
    const rationale = rationaleParts.join(" | ");

    const formData = new FormData();
    formData.set("itemId", item.id);
    formData.set("evidenceSummary", summaryTrimmed);
    formData.set("_itemId", item.id);
    formData.set("_rationale", rationale);

    try {
      // The server action is a void Promise; throws on failure.
      await markAttestedAction(formData);
      onOpenChange(false);
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : "Failed to submit attestation. Try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl"
        onOpenAutoFocus={(e) => {
          // Defer to our manual focus on the summary textarea.
          e.preventDefault();
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-start gap-3 border-b border-white/[0.06] px-5 py-4">
            <span
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/20"
              aria-hidden
            >
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-[14px]">
                Mark item as attested
              </DialogTitle>
              <DialogDescription className="mt-0.5 truncate text-[11.5px]">
                {item.regulationLabel} · {item.requirementId}
              </DialogDescription>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-4 px-5 py-4">
            {/* Disclaimer — what attestation means in this product */}
            <div className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11.5px] leading-relaxed text-slate-400">
              Attestation creates an audit-logged record that this compliance
              item is satisfied. The evidence summary, your identity, and
              timestamp are hash-chained into the audit trail (5-year retention
              per §22 AWV / 15 CFR 762).
            </div>

            {/* Evidence summary — required */}
            <div>
              <label
                htmlFor="attest-summary"
                className="mb-1.5 flex items-baseline justify-between text-[12px] font-medium text-slate-200"
              >
                <span>
                  Evidence summary
                  <span
                    aria-hidden
                    className="ml-1 text-rose-400"
                    title="Required"
                  >
                    *
                  </span>
                </span>
                <span className="text-[10.5px] text-slate-500">
                  {summaryTrimmed.length} / {MAX_SUMMARY_LENGTH}
                </span>
              </label>
              <textarea
                id="attest-summary"
                autoFocus
                value={summary}
                onChange={(e) =>
                  setSummary(e.target.value.slice(0, MAX_SUMMARY_LENGTH))
                }
                rows={4}
                placeholder="What proves this compliance item is satisfied? Reference document IDs, evidence packet, attestation date, etc."
                className="block w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12.5px] leading-relaxed text-slate-100 placeholder-slate-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              {!summaryValid && summaryTrimmed.length > 0 ? (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-300/80">
                  <AlertCircle className="h-3 w-3" strokeWidth={2} />
                  {summaryRemaining} more character
                  {summaryRemaining === 1 ? "" : "s"} required
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-500">
                  Minimum {MIN_SUMMARY_LENGTH} characters. Specific is better —
                  auditors read this first.
                </p>
              )}
            </div>

            {/* Co-signer — optional */}
            <div>
              <label
                htmlFor="attest-cosigner"
                className="mb-1.5 block text-[12px] font-medium text-slate-200"
              >
                Co-signer email
                <span className="ml-1 font-normal text-slate-500">
                  (optional)
                </span>
              </label>
              <input
                id="attest-cosigner"
                type="email"
                value={coSigner}
                onChange={(e) => setCoSigner(e.target.value)}
                placeholder="four-eyes@your-org.com"
                className="block w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12.5px] text-slate-100 placeholder-slate-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              {!coSignerValid ? (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-300/80">
                  <AlertCircle className="h-3 w-3" strokeWidth={2} />
                  Use a valid email or leave empty
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-500">
                  Lands in the audit log as the second-pair-of-eyes reference.
                  They are NOT notified by email (yet).
                </p>
              )}
            </div>

            {/* Additional notes — optional */}
            <div>
              <label
                htmlFor="attest-notes"
                className="mb-1.5 flex items-baseline justify-between text-[12px] font-medium text-slate-200"
              >
                <span>
                  Additional notes
                  <span className="ml-1 font-normal text-slate-500">
                    (optional)
                  </span>
                </span>
                <span className="text-[10.5px] text-slate-500">
                  {notes.length} / {MAX_NOTES_LENGTH}
                </span>
              </label>
              <textarea
                id="attest-notes"
                value={notes}
                onChange={(e) =>
                  setNotes(e.target.value.slice(0, MAX_NOTES_LENGTH))
                }
                rows={2}
                placeholder="e.g. Evidence packet 2026-Q1-NIS2-A12 in vault. Last updated by CISO 2026-04-30."
                className="block w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12.5px] leading-relaxed text-slate-100 placeholder-slate-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Server error */}
            {serverError ? (
              <div
                role="alert"
                className="rounded-md border border-rose-500/25 bg-rose-500/[0.06] px-3 py-2 text-[11.5px] text-rose-300"
              >
                {serverError}
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] bg-white/[0.012] px-5 py-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="rounded-md px-3 py-1.5 text-[12px] font-medium text-slate-400 transition hover:text-slate-200 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3.5 py-1.5 text-[12px] font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500"
            >
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
              {submitting ? "Attesting…" : "Mark attested"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
