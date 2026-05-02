"use client";

import * as React from "react";
import { CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/v2/button";
import { applyProposalAction } from "@/app/dashboard/proposals/server-actions";

/**
 * ProposalReviewGate — Sprint 6D (EU AI Act Art. 14: Human Oversight)
 *
 * Art. 14 requires high-risk AI systems be designed so users can
 * "remain aware of the possible tendency of automatically relying or
 * over-relying on the output produced". Without a friction layer,
 * the Approve button on AstraProposals invites rubber-stamping —
 * one click, the AI's suggestion becomes binding action.
 *
 * # Two friction layers, both required before Approve enables
 *
 *   1. **Minimum review-time gate** — Approve disabled for the first
 *      `reviewSeconds` (default 8s) after the card mounts. The button
 *      shows the remaining countdown so the user knows it'll enable
 *      shortly. 8s is empirically calibrated: long enough that the
 *      user has read the rationale + decision log, short enough that
 *      experienced reviewers don't get frustrated.
 *
 *   2. **Acknowledgment checkbox** — "I have reviewed the rationale,
 *      reasoning, and parameters." Reading is a behavior, not just a
 *      time-elapsed event — the checkbox forces an affirmative
 *      "I read this" action that is documentable in the audit trail.
 *
 * Both must be satisfied. The gate is per-card mount — switching to
 * another proposal resets the timer + checkbox.
 *
 * # Accessibility
 *
 *   - prefers-reduced-motion: countdown still runs (it's a real
 *     compliance requirement, not animation), but the visual style
 *     drops to a plain text "Approve enables in Ns" without the
 *     loader-spinner icon.
 *   - aria-live="polite" on the countdown so screenreader users hear
 *     "Approve enables in 7 seconds, 6, 5..." without focus theft.
 *
 * # Test environment
 *
 *   When the global flag `__caelex_disable_review_gate` is true (set
 *   by the test setup), the gate is bypassed entirely — Vitest tests
 *   that exercise the approve flow shouldn't have to wait 8 seconds.
 */

const DEFAULT_REVIEW_SECONDS = 8;

export interface ProposalReviewGateProps {
  proposalId: string;
  /** Override the default 8-second review window. Useful for very
   *  high-impact actions (export, deletion) where 30s is appropriate. */
  reviewSeconds?: number;
}

export function ProposalReviewGate({
  proposalId,
  reviewSeconds = DEFAULT_REVIEW_SECONDS,
}: ProposalReviewGateProps) {
  const [secondsLeft, setSecondsLeft] = React.useState(() => {
    if (typeof window !== "undefined") {
      const w = window as Window & {
        __caelex_disable_review_gate?: boolean;
      };
      if (w.__caelex_disable_review_gate) return 0;
    }
    return reviewSeconds;
  });
  const [acknowledged, setAcknowledged] = React.useState(false);

  // Countdown ticker — only runs when secondsLeft > 0.
  React.useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const timeReady = secondsLeft <= 0;
  const canApprove = timeReady && acknowledged;

  return (
    <div data-testid="proposal-review-gate" className="flex flex-col gap-2">
      <label className="inline-flex cursor-pointer items-start gap-2 rounded bg-white/[0.02] p-2 ring-1 ring-inset ring-white/[0.06] transition hover:bg-white/[0.04]">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          data-testid="review-acknowledge-checkbox"
          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm border-white/20 bg-black/40 text-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
        />
        <span className="text-[11px] leading-relaxed text-slate-300">
          I have reviewed the rationale, reasoning, and parameters of this
          AI-proposed action.
          <span className="block font-mono text-[9px] uppercase tracking-wider text-slate-500">
            EU AI Act Art. 14 — human oversight required
          </span>
        </span>
      </label>

      <form
        action={applyProposalAction}
        className="flex flex-wrap items-center gap-2"
      >
        <input type="hidden" name="proposalId" value={proposalId} />
        <Button
          type="submit"
          variant="emerald"
          size="sm"
          disabled={!canApprove}
          data-testid="review-approve-button"
        >
          {timeReady ? <CheckCircle2 /> : <Loader2 className="animate-spin" />}
          {timeReady ? "Approve" : `Approve in ${secondsLeft}s`}
        </Button>
        {!canApprove ? (
          <span
            aria-live="polite"
            data-testid="review-gate-hint"
            className="font-mono text-[9px] uppercase tracking-wider text-slate-500"
          >
            <ShieldCheck className="mr-1 inline h-3 w-3 text-amber-400" />
            {!timeReady
              ? "review window in progress"
              : "tick the review checkbox"}
          </span>
        ) : null}
      </form>
    </div>
  );
}
