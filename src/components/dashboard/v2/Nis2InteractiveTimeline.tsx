"use client";

/**
 * Sprint UF2 — interactive wrapper around Nis2PhaseCountdown.
 *
 * The base Nis2PhaseCountdown is server-safe (no client APIs) and
 * read-only. This wrapper adds:
 *   - Per-row "Submit phase" button when phase is unsubmitted
 *   - Dialog state management (which phase is being submitted)
 *   - Wiring to the Nis2PhaseSubmitDialog
 *
 * Used on Mission detail (Sprint MA's Nis2PhaseAlertSection) +
 * incident detail (future). The read-only Nis2PhaseCountdown is
 * still importable for surfaces where actions don't fit (Today
 * page summary widgets, embedded reports).
 */

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { Nis2PhaseCountdown, type PhaseRow } from "./Nis2PhaseCountdown";
import {
  Nis2PhaseSubmitDialog,
  type NIS2PhaseKey,
} from "./Nis2PhaseSubmitDialog";

const VALID_PHASE_KEYS: ReadonlySet<NIS2PhaseKey> = new Set([
  "early_warning",
  "notification",
  "intermediate_report",
  "final_report",
]);

function isValidPhaseKey(value: string): value is NIS2PhaseKey {
  return VALID_PHASE_KEYS.has(value as NIS2PhaseKey);
}

export function Nis2InteractiveTimeline({
  phases,
  showIncidentRef,
}: {
  phases: PhaseRow[];
  showIncidentRef?: boolean;
}) {
  const [activePhase, setActivePhase] = React.useState<PhaseRow | null>(null);

  // Keep `now` stable across renders so the countdown bars don't
  // re-flow on every state update. Refresh once a minute (live but
  // not jittery).
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <Nis2PhaseCountdown
        phases={phases}
        now={now}
        showIncidentRef={showIncidentRef}
      />

      {/* Submit-buttons row, rendered as a sticky strip below the
          timeline rather than per-row to keep the timeline visually
          clean. Pressed-on-row also works since each row carries
          incidentId — but a single CTA list is more discoverable. */}
      {phases.some(canSubmit) ? (
        <div className="border-t border-white/[0.05] bg-white/[0.012] px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-slate-400">
              Submit phase reports:
            </span>
            {phases.filter(canSubmit).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePhase(p)}
                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/[0.06] px-2.5 py-1 text-[11.5px] font-medium text-emerald-200 transition hover:border-emerald-500/40 hover:bg-emerald-500/[0.1]"
              >
                <ShieldCheck className="h-3 w-3" />
                {phaseShortLabel(p.phase)}
                {p.incidentNumber ? (
                  <span className="font-mono text-[10px] text-emerald-300/70">
                    {p.incidentNumber}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {activePhase &&
      activePhase.incidentId &&
      isValidPhaseKey(activePhase.phase) ? (
        <Nis2PhaseSubmitDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setActivePhase(null);
          }}
          incidentId={activePhase.incidentId}
          incidentNumber={activePhase.incidentNumber ?? "—"}
          incidentTitle={activePhase.incidentTitle ?? "Untitled incident"}
          phase={activePhase.phase}
          deadline={activePhase.deadline}
          onSubmitted={() => setActivePhase(null)}
        />
      ) : null}
    </>
  );
}

function canSubmit(p: PhaseRow): boolean {
  // Submit button shown if not submitted AND we have the incident ID
  // to dispatch the PATCH against.
  return p.status !== "submitted" && Boolean(p.incidentId);
}

function phaseShortLabel(phase: string): string {
  switch (phase) {
    case "early_warning":
      return "Early warning (24h)";
    case "notification":
      return "Notification (72h)";
    case "intermediate_report":
      return "Intermediate";
    case "final_report":
      return "Final report";
    default:
      return phase;
  }
}
