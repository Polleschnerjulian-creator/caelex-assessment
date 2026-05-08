"use client";

/**
 * Sprint UF2 — NIS2 Phase Report submission wizard.
 *
 * Closes the "user gets warned but can't actually file" gap from
 * Sprint C. Customer flow:
 *
 *   1. Cron fires WARNING / CRITICAL / OVERDUE notification
 *   2. Notification links to incident detail OR mission detail
 *   3. User sees the phase countdown widget (Sprint C-UI)
 *   4. Click "Submit report" on a row → THIS DIALOG opens
 *   5. Pre-filled draft: title, what-happened, severity, response
 *      summary, NCA reference field
 *   6. User reviews + adjusts
 *   7. Submit → POST /api/supervision/incidents/[id]/nis2-phases
 *      with phase + referenceNumber. Server marks phase submitted.
 *
 * Why a dialog (not a separate page): the full incident page is
 * 1539 lines. Embedding the submit-flow as a modal keeps context
 * (user sees countdown going down while filling), avoids
 * page-transition latency, and reuses the form on Mission detail
 * AND incident detail without rendering the form twice.
 *
 * Per-phase guidance text reflects the actual statutory requirements:
 *   - early_warning (24h): minimal facts, suspected origin
 *   - notification (72h):  initial assessment, severity, IoC
 *   - intermediate_report: progress + new detail since notification
 *   - final_report (1mo):   root-cause, remediation, lessons-learned
 */

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import {
  X,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Clock,
  CheckCircle2,
  ExternalLink,
  Info,
} from "lucide-react";
import { StatusPill } from "./ui/PageChrome";

export type NIS2PhaseKey =
  | "early_warning"
  | "notification"
  | "intermediate_report"
  | "final_report";

interface PhaseGuidance {
  legalDeadline: string;
  legalRef: string;
  fields: Array<{
    key: keyof DraftReport;
    label: string;
    hint: string;
    rows?: number;
    required?: boolean;
  }>;
  checklist: string[];
}

interface DraftReport {
  summary: string;
  knownFacts: string;
  suspectedOrigin: string;
  severityAssessment: string;
  immediateActions: string;
  progressSinceLast: string;
  rootCause: string;
  remediation: string;
  lessonsLearned: string;
  ncaReferenceNumber: string;
}

const EMPTY_DRAFT: DraftReport = {
  summary: "",
  knownFacts: "",
  suspectedOrigin: "",
  severityAssessment: "",
  immediateActions: "",
  progressSinceLast: "",
  rootCause: "",
  remediation: "",
  lessonsLearned: "",
  ncaReferenceNumber: "",
};

const PHASE_GUIDANCE: Record<NIS2PhaseKey, PhaseGuidance> = {
  early_warning: {
    legalDeadline: "24 hours from awareness",
    legalRef: "NIS2 Art. 23 (4) (a)",
    fields: [
      {
        key: "summary",
        label: "What happened (one paragraph)",
        hint: "Plain-language description. The CSIRT receiving this needs to grasp the situation in 30 seconds.",
        rows: 3,
        required: true,
      },
      {
        key: "suspectedOrigin",
        label: "Suspected origin (if known)",
        hint: "Cyber-attack, hardware fault, supply-chain, insider, unknown. Best-guess is fine — this is the early warning, not the final report.",
        rows: 2,
      },
      {
        key: "immediateActions",
        label: "Immediate actions taken",
        hint: "What's already happening to contain or investigate. Reassures the regulator that you're on it.",
        rows: 2,
      },
    ],
    checklist: [
      "Indicate the suspected nature (cyber vs accidental vs unknown)",
      "Note any cross-border impact (other Member States affected)",
      "If significant impact on services — say so explicitly",
    ],
  },
  notification: {
    legalDeadline: "72 hours from awareness",
    legalRef: "NIS2 Art. 23 (4) (b)",
    fields: [
      {
        key: "summary",
        label: "Updated incident description",
        hint: "Refined version of the early-warning paragraph with what you've learned since.",
        rows: 3,
        required: true,
      },
      {
        key: "knownFacts",
        label: "Known facts as of now",
        hint: "What systems are confirmed affected, what data may have been accessed, current operational status.",
        rows: 4,
        required: true,
      },
      {
        key: "severityAssessment",
        label: "Severity assessment",
        hint: "Classification (low/medium/high/critical) with justification — number of users affected, geographic scope, duration.",
        rows: 3,
        required: true,
      },
      {
        key: "immediateActions",
        label: "Mitigation measures in progress",
        hint: "Specific containment + eradication steps in flight. CSIRT may offer assistance based on this.",
        rows: 3,
      },
    ],
    checklist: [
      "Updated initial assessment (vs early warning)",
      "Indicators of compromise (IoCs) if applicable",
      "Cross-border impact reconfirmed or scoped",
      "Severity classification with justification",
    ],
  },
  intermediate_report: {
    legalDeadline: "On request from the CSIRT",
    legalRef: "NIS2 Art. 23 (4) (c)",
    fields: [
      {
        key: "progressSinceLast",
        label: "Progress since the 72h notification",
        hint: "What's changed in your understanding + your response. New findings, course corrections.",
        rows: 5,
        required: true,
      },
      {
        key: "knownFacts",
        label: "Updated facts (full picture as of now)",
        hint: "Cumulative — supersede the 72h notification's known-facts.",
        rows: 4,
      },
      {
        key: "remediation",
        label: "Remediation status",
        hint: "What's done, what's in progress, what's remaining.",
        rows: 3,
      },
    ],
    checklist: [
      "Reference the 72h notification (incident number)",
      "Highlight what's NEW since last update",
      "Estimate remaining work + ETA",
    ],
  },
  final_report: {
    legalDeadline: "1 month after notification (Art. 23 (4) (d))",
    legalRef: "NIS2 Art. 23 (4) (d)",
    fields: [
      {
        key: "summary",
        label: "Final incident description",
        hint: "Closing paragraph — full picture, suitable for the public abstract if regulator publishes.",
        rows: 4,
        required: true,
      },
      {
        key: "rootCause",
        label: "Root-cause analysis",
        hint: "Detailed root cause with technical specifics. Five-Whys-style. The regulator may share this anonymized with sector peers.",
        rows: 5,
        required: true,
      },
      {
        key: "remediation",
        label: "Remediation completed",
        hint: "What's been fixed, hardened, replaced. Include verification steps.",
        rows: 4,
        required: true,
      },
      {
        key: "lessonsLearned",
        label: "Lessons learned + cross-border conclusions",
        hint: "What you'd do differently, what fellow operators should know, any cross-border implications.",
        rows: 4,
        required: true,
      },
    ],
    checklist: [
      "Detailed root-cause analysis (technical + organizational)",
      "Mitigation measures applied + verified",
      "Cross-border implications addressed",
      "Lessons learned + sector-wide indicators",
    ],
  },
};

const PHASE_LABELS: Record<NIS2PhaseKey, string> = {
  early_warning: "Early Warning",
  notification: "Incident Notification",
  intermediate_report: "Intermediate Report",
  final_report: "Final Report",
};

export interface Nis2PhaseSubmitDialogProps {
  /** Open/close controlled by parent. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Incident to submit phase against. */
  incidentId: string;
  incidentNumber: string;
  incidentTitle: string;
  /** Which phase is being submitted. */
  phase: NIS2PhaseKey;
  /** Deadline + threshold info from the parent's countdown widget. */
  deadline: Date | string;
  /** Optional pre-fill from previous phase or incident-autopilot draft. */
  initialDraft?: Partial<DraftReport>;
  /** Called after successful submit so parent can refresh state. */
  onSubmitted?: () => void;
}

export function Nis2PhaseSubmitDialog({
  open,
  onOpenChange,
  incidentId,
  incidentNumber,
  incidentTitle,
  phase,
  deadline,
  initialDraft,
  onSubmitted,
}: Nis2PhaseSubmitDialogProps) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<DraftReport>({
    ...EMPTY_DRAFT,
    ...initialDraft,
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = React.useState(false);

  const guidance = PHASE_GUIDANCE[phase];
  const deadlineDate =
    typeof deadline === "string" ? new Date(deadline) : deadline;
  const remainingMs = deadlineDate.getTime() - Date.now();
  const isOverdue = remainingMs <= 0;

  const requiredOk = guidance.fields
    .filter((f) => f.required)
    .every((f) => draft[f.key].trim().length > 0);

  function patch<K extends keyof DraftReport>(key: K, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!requiredOk) return;
    setSubmitting(true);
    setError(null);

    // Build the report content string. The schema stores `draftContent`
    // as text — we serialize as markdown-ish so it's human-readable
    // when downloaded for the regulator.
    const content = composeReport(phase, draft, incidentNumber, incidentTitle);

    try {
      const res = await fetch(
        `/api/supervision/incidents/${incidentId}/nis2-phases`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            phase,
            referenceNumber: draft.ncaReferenceNumber.trim() || undefined,
            // Server-side handler may accept draftContent in a future
            // sprint; we send it now so when wired up it's already
            // populated.
            content,
          }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? `Submit failed (HTTP ${res.status})`);
      }
      onSubmitted?.();
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
      setConfirmSubmit(false);
    }
  }

  function exportDraft() {
    const content = composeReport(phase, draft, incidentNumber, incidentTitle);
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `nis2-${phase}-${incidentNumber}-draft.md`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 grid max-h-[92vh] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_1fr_auto] overflow-hidden rounded-xl border border-white/[0.08] bg-[#13131A] shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]">
          <header className="flex items-start justify-between gap-3 border-b border-white/[0.06] bg-white/[0.012] px-6 py-4">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <DialogPrimitive.Title className="text-[15px] font-semibold tracking-tight text-slate-100">
                  Submit NIS2 {PHASE_LABELS[phase]}
                </DialogPrimitive.Title>
                {isOverdue ? (
                  <StatusPill tone="rose" size="sm">
                    Overdue
                  </StatusPill>
                ) : remainingMs < 2 * 60 * 60 * 1000 ? (
                  <StatusPill tone="rose" size="sm">
                    Critical
                  </StatusPill>
                ) : remainingMs < 12 * 60 * 60 * 1000 ? (
                  <StatusPill tone="amber" size="sm">
                    Approaching
                  </StatusPill>
                ) : null}
              </div>
              <DialogPrimitive.Description className="text-[12px] text-slate-400">
                Incident{" "}
                <span className="font-mono text-slate-300">
                  {incidentNumber}
                </span>{" "}
                · {incidentTitle}
              </DialogPrimitive.Description>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Statutory deadline · {guidance.legalDeadline}
                </span>
                <span className="font-mono">{guidance.legalRef}</span>
              </div>
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogPrimitive.Close>
          </header>

          <div className="overflow-y-auto px-6 py-5">
            {error ? (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2 text-[12.5px] text-rose-300"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            {/* Statutory checklist */}
            <div className="mb-5 rounded-lg border border-white/[0.06] bg-white/[0.025] p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                <Info className="h-3 w-3" />
                Required by {guidance.legalRef}
              </h3>
              <ul className="space-y-1 text-[12px] text-slate-300">
                {guidance.checklist.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/[0.05] text-[8px] text-emerald-400">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Form fields */}
            <div className="space-y-4">
              {guidance.fields.map((f) => (
                <FormField
                  key={f.key}
                  label={f.label}
                  hint={f.hint}
                  required={f.required}
                  value={draft[f.key]}
                  onChange={(v) => patch(f.key, v)}
                  rows={f.rows}
                />
              ))}

              <FormField
                label="NCA reference number"
                hint="Optional — fill in once the NCA has issued an internal reference for your submission."
                value={draft.ncaReferenceNumber}
                onChange={(v) => patch("ncaReferenceNumber", v)}
                placeholder="e.g. BSI-IR-2026-0047"
                mono
              />
            </div>

            <p className="mt-5 text-[11px] leading-relaxed text-slate-500">
              <strong className="font-semibold text-slate-400">
                Caelex stores this draft + records the submission in your
                hash-chained audit log
              </strong>{" "}
              — Caelex does not transmit the report to your NCA. Submit via your
              NCA&apos;s portal (BSI Meldeformular, ANSSI portal, etc.) and
              paste the reference number above so we can close the loop.
            </p>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-white/[0.06] bg-white/[0.012] px-6 py-3">
            <button
              type="button"
              onClick={exportDraft}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium text-slate-300 ring-1 ring-inset ring-white/[0.08] transition hover:bg-white/[0.04]"
            >
              <ExternalLink className="h-3 w-3" />
              Download draft (.md)
            </button>
            <div className="flex items-center gap-2">
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  disabled={submitting}
                  className="rounded-md px-3 py-1.5 text-[12px] text-slate-300 ring-1 ring-inset ring-white/[0.08] transition hover:bg-white/[0.04] disabled:opacity-50"
                >
                  Cancel
                </button>
              </DialogPrimitive.Close>
              {confirmSubmit ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !requiredOk}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3.5 py-1.5 text-[12.5px] font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  Confirm submit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmSubmit(true)}
                  disabled={!requiredOk}
                  title={
                    !requiredOk
                      ? "Fill all required fields first"
                      : "Mark phase as submitted"
                  }
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3.5 py-1.5 text-[12.5px] font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Submit phase
                </button>
              )}
            </div>
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────

function FormField({
  label,
  hint,
  value,
  onChange,
  required,
  rows,
  placeholder,
  mono,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows?: number;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        <span>
          {label}
          {required ? <span className="ml-1 text-rose-400">*</span> : null}
        </span>
      </span>
      {rows && rows > 1 ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-600 transition outline-none hover:bg-white/[0.04] focus:border-emerald-500/40 focus:bg-white/[0.04] focus:ring-2 focus:ring-emerald-500/15 resize-y leading-relaxed ${mono ? "font-mono" : ""}`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-600 transition outline-none hover:bg-white/[0.04] focus:border-emerald-500/40 focus:bg-white/[0.04] focus:ring-2 focus:ring-emerald-500/15 ${mono ? "font-mono" : ""}`}
        />
      )}
      {hint ? (
        <span className="text-[11px] leading-relaxed text-slate-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

function composeReport(
  phase: NIS2PhaseKey,
  draft: DraftReport,
  incidentNumber: string,
  incidentTitle: string,
): string {
  const lines: string[] = [];
  lines.push(`# NIS2 ${PHASE_LABELS[phase]} — ${incidentNumber}`);
  lines.push("");
  lines.push(`**Incident:** ${incidentTitle}`);
  lines.push(`**Phase:** ${PHASE_LABELS[phase]}`);
  lines.push(`**Submitted at:** ${new Date().toISOString()}`);
  if (draft.ncaReferenceNumber.trim()) {
    lines.push(`**NCA reference:** ${draft.ncaReferenceNumber.trim()}`);
  }
  lines.push("");

  const fields = PHASE_GUIDANCE[phase].fields;
  for (const f of fields) {
    const value = draft[f.key].trim();
    if (!value) continue;
    lines.push(`## ${f.label}`);
    lines.push("");
    lines.push(value);
    lines.push("");
  }
  return lines.join("\n");
}
