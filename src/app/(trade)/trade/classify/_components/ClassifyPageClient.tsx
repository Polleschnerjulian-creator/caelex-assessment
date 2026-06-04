"use client";

/**
 * /trade/classify — Client surface for the Z4 AI Classification Copilot.
 *
 * Holds three regions:
 *   1. Header + role banner
 *   2. Upload pane: drag-drop PDF, paste-text, "Generate draft" action
 *   3. Drafts list: cards for every saved draft, click to open the
 *      review modal
 *
 * The review modal is rendered inline (no portal) — the trade shell is
 * already a floating panel, so the modal lifts on a backdrop within
 * the main content area. The modal reads the draft's persisted
 * `evidence` JSON to render proposals, attributes, evidence spans, and
 * the verbatim disclaimer.
 */

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  Pencil,
  AlertTriangle,
  Sparkles,
  Clock,
  FileText,
  X,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

import {
  generateDraftFromText,
  generateDraftFromPdf,
  decideDraft,
} from "@/lib/trade/classification-draft-actions";
import type { ClassificationDraft } from "@/lib/trade/classification-draft-builder";

// ─── Public props ──────────────────────────────────────────────────

type Decision = "PENDING" | "ACCEPTED" | "REJECTED" | "MODIFIED";

export interface DraftRowVM {
  id: string;
  proposedEccn: string | null;
  proposedRegime: string | null;
  confidence: string | null;
  decision: Decision;
  sourceFilename: string | null;
  tradeItemId: string | null;
  createdAt: string;
  reviewedAt: string | null;
  /** The persisted JSON proposal — full `ClassificationDraft` shape. */
  evidence: unknown;
}

interface ClassifyPageClientProps {
  canEdit: boolean;
  initialDrafts: DraftRowVM[];
}

// ─── Page ──────────────────────────────────────────────────────────

export function ClassifyPageClient({
  canEdit,
  initialDrafts,
}: ClassifyPageClientProps) {
  const [drafts, setDrafts] = useState<DraftRowVM[]>(initialDrafts);
  const [openDraft, setOpenDraft] = useState<DraftRowVM | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const handleDraftCreated = useCallback((row: DraftRowVM) => {
    setDrafts((current) => [row, ...current]);
    setActionToast(
      row.proposedEccn
        ? `Draft created — proposed ${row.proposedEccn}`
        : "Draft saved with no clear match",
    );
  }, []);

  const handleDecisionRecorded = useCallback(
    (draftId: string, decision: Decision) => {
      setDrafts((current) =>
        current.map((d) => (d.id === draftId ? { ...d, decision } : d)),
      );
      setOpenDraft(null);
      setActionToast(`Decision recorded: ${decision}`);
    },
    [],
  );

  return (
    <div className="flex h-full flex-col gap-5 p-6">
      <header>
        <div className="mb-1 flex items-center gap-2 text-trade-text-muted">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium uppercase tracking-[0.18em]">
            Sprint Z4 — AI Copilot
          </span>
        </div>
        <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-trade-text-primary">
          Classification Copilot
        </h1>
        <p className="mt-1 max-w-[640px] text-[13px] leading-[1.55] text-trade-text-secondary">
          Drop a datasheet PDF or paste vendor text. The copilot extracts typed
          parametric attributes, runs the regulatory cross-walk, and drafts a
          defensible ECCN / USML / EU Annex I proposal for your review.{" "}
          {!canEdit && (
            <span className="text-trade-text-muted">
              Read-only — MEMBER+ role required to generate new drafts.
            </span>
          )}
        </p>
      </header>

      {actionToast && (
        <Banner
          icon={CheckCircle2}
          tone="success"
          message={actionToast}
          onDismiss={() => setActionToast(null)}
        />
      )}
      {actionError && (
        <Banner
          icon={AlertTriangle}
          tone="error"
          message={actionError}
          onDismiss={() => setActionError(null)}
        />
      )}

      {canEdit && (
        <UploadPane onCreated={handleDraftCreated} onError={setActionError} />
      )}

      <DraftsList
        drafts={drafts}
        onSelect={(d) => setOpenDraft(d)}
        canEdit={canEdit}
      />

      {openDraft && (
        <ReviewModal
          draft={openDraft}
          canEdit={canEdit}
          onClose={() => setOpenDraft(null)}
          onDecisionRecorded={handleDecisionRecorded}
          onError={setActionError}
        />
      )}
    </div>
  );
}

// ─── Upload pane ───────────────────────────────────────────────────

interface UploadPaneProps {
  onCreated: (row: DraftRowVM) => void;
  onError: (msg: string) => void;
}

function UploadPane({ onCreated, onError }: UploadPaneProps) {
  const [pending, startTransition] = useTransition();
  const [rawText, setRawText] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const submitText = useCallback(() => {
    if (rawText.trim().length < 20) {
      onError("Paste at least 20 characters of datasheet text.");
      return;
    }
    startTransition(async () => {
      const result = await generateDraftFromText({ rawText });
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onCreated({
        id: result.draftId,
        proposedEccn: result.primary,
        proposedRegime: null,
        confidence: null,
        decision: "PENDING",
        sourceFilename: null,
        tradeItemId: null,
        createdAt: new Date().toISOString(),
        reviewedAt: null,
        evidence: null, // page will re-fetch on next navigation
      });
      setRawText("");
    });
  }, [rawText, onCreated, onError]);

  const submitFile = useCallback(
    (file: File) => {
      if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
      ) {
        onError("Only PDF files are supported.");
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => onError("Failed to read PDF file.");
      reader.onload = () => {
        const dataUri = reader.result;
        if (typeof dataUri !== "string") {
          onError("Failed to encode PDF for upload.");
          return;
        }
        startTransition(async () => {
          const result = await generateDraftFromPdf({
            pdfBase64: dataUri,
            sourceFilename: file.name,
          });
          if (!result.ok) {
            onError(result.error);
            return;
          }
          onCreated({
            id: result.draftId,
            proposedEccn: result.primary,
            proposedRegime: null,
            confidence: null,
            decision: "PENDING",
            sourceFilename: file.name,
            tradeItemId: null,
            createdAt: new Date().toISOString(),
            reviewedAt: null,
            evidence: null,
          });
        });
      };
      reader.readAsDataURL(file);
    },
    [onCreated, onError],
  );

  return (
    <section className="grid gap-4 rounded-xl border border-trade-border-subtle bg-trade-bg-elevated p-5 md:grid-cols-2">
      {/* Drag-drop PDF */}
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-trade-text-muted">
          Upload Datasheet PDF
        </label>
        <label
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) submitFile(file);
          }}
          className={`flex h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-[12.5px] transition ${
            dragOver
              ? "border-trade-accent bg-trade-accent-soft text-trade-accent-strong"
              : "border-trade-border bg-trade-bg-page text-trade-text-secondary hover:border-trade-accent/60 hover:bg-trade-hover"
          }`}
        >
          {pending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Upload className="h-5 w-5" strokeWidth={1.5} />
          )}
          <span>
            Drag a PDF here or{" "}
            <span className="font-semibold text-trade-accent-strong">
              browse
            </span>
          </span>
          <span className="text-[10.5px] text-trade-text-muted">
            PDF only, max 8 MB
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            disabled={pending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) submitFile(file);
            }}
          />
        </label>
      </div>

      {/* Paste text */}
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-trade-text-muted">
          Or Paste Datasheet Text
        </label>
        <textarea
          className="h-[105px] w-full resize-none rounded-lg border border-trade-border bg-trade-bg-panel px-3 py-2 text-[13px] text-trade-text-primary placeholder:text-trade-text-muted outline-none transition focus:border-trade-accent focus:ring-2 focus:ring-trade-accent/30"
          placeholder="e.g. Earth-observation satellite. Primary aperture: 0.30 m. Specially designed for spaceflight…"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          disabled={pending}
        />
        <button
          type="button"
          disabled={pending || rawText.trim().length < 20}
          onClick={submitText}
          className="mt-2 inline-flex items-center gap-2 rounded-md bg-trade-accent px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-trade-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Generate Draft
        </button>
      </div>
    </section>
  );
}

// ─── Drafts list ───────────────────────────────────────────────────

interface DraftsListProps {
  drafts: DraftRowVM[];
  canEdit: boolean;
  onSelect: (d: DraftRowVM) => void;
}

function DraftsList({ drafts, onSelect }: DraftsListProps) {
  if (drafts.length === 0) {
    return (
      <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-5 py-12 text-center">
        <FileText
          aria-hidden="true"
          className="mx-auto mb-3 h-7 w-7 text-trade-text-muted"
        />
        <h3 className="mb-1 text-[14.5px] font-semibold text-trade-text-primary">
          No drafts yet
        </h3>
        <p className="text-[12.5px] text-trade-text-secondary">
          Upload a datasheet or paste text above to generate your first draft.
        </p>
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-center justify-between px-1">
        <h2 className="text-[13px] font-semibold text-trade-text-primary">
          Recent drafts ({drafts.length})
        </h2>
      </header>
      <ul className="grid gap-2">
        {drafts.map((d) => (
          <DraftListItem key={d.id} draft={d} onSelect={onSelect} />
        ))}
      </ul>
    </section>
  );
}

interface DraftListItemProps {
  draft: DraftRowVM;
  onSelect: (d: DraftRowVM) => void;
}

function DraftListItem({ draft, onSelect }: DraftListItemProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(draft)}
        className="group flex w-full items-center gap-4 rounded-lg border border-trade-border-subtle bg-trade-bg-elevated px-4 py-3 text-left transition hover:border-trade-accent/40 hover:bg-trade-hover"
      >
        <DecisionBadge decision={draft.decision} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[13px] font-semibold text-trade-text-primary">
              {draft.proposedEccn ?? "No clean match"}
            </span>
            {draft.proposedRegime && (
              <span className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-trade-text-muted">
                {draft.proposedRegime}
              </span>
            )}
            {draft.confidence && (
              <ConfidencePill confidence={draft.confidence} />
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-trade-text-muted">
            {draft.sourceFilename ? (
              <span className="truncate">{draft.sourceFilename}</span>
            ) : (
              <span>Pasted text</span>
            )}
            <span>·</span>
            <span>{new Date(draft.createdAt).toLocaleString()}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-trade-text-muted transition group-hover:text-trade-text-primary" />
      </button>
    </li>
  );
}

// ─── Review modal ──────────────────────────────────────────────────

interface ReviewModalProps {
  draft: DraftRowVM;
  canEdit: boolean;
  onClose: () => void;
  onDecisionRecorded: (draftId: string, decision: Decision) => void;
  onError: (msg: string) => void;
}

function ReviewModal({
  draft,
  canEdit,
  onClose,
  onDecisionRecorded,
  onError,
}: ReviewModalProps) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const payload = useMemo(
    () => parseEvidence(draft.evidence),
    [draft.evidence],
  );

  const isPending = draft.decision === "PENDING";

  const submitDecision = useCallback(
    (decision: "ACCEPTED" | "REJECTED" | "MODIFIED") => {
      startTransition(async () => {
        const result = await decideDraft({
          draftId: draft.id,
          decision,
          reviewNote: note,
          acceptedSnapshot:
            decision === "REJECTED"
              ? null
              : payload?.primary
                ? {
                    canonicalId: payload.primary.canonicalId,
                    regime: payload.primary.regime,
                    confidence: payload.primary.confidence,
                  }
                : null,
        });
        if (!result.ok) {
          onError(result.error);
          return;
        }
        onDecisionRecorded(draft.id, result.decision);
      });
    },
    [draft.id, note, payload, onDecisionRecorded, onError],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-[760px] flex-col gap-0 overflow-hidden rounded-2xl bg-trade-bg-panel shadow-2xl ring-1 ring-trade-border"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-trade-border-subtle px-5 py-3">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[15px] font-semibold text-trade-text-primary">
              {draft.proposedEccn ?? "No clean match"}
            </span>
            {draft.proposedRegime && (
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-trade-text-muted">
                {draft.proposedRegime}
              </span>
            )}
            {draft.confidence && (
              <ConfidencePill confidence={draft.confidence} />
            )}
            <DecisionBadge decision={draft.decision} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-trade-text-muted transition hover:bg-trade-hover hover:text-trade-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {payload ? (
            <>
              <Section title="Summary">
                <p className="text-[13px] leading-[1.55] text-trade-text-secondary">
                  {payload.summary}
                </p>
              </Section>

              {payload.proposals.length > 0 && (
                <Section title={`Proposals (${payload.proposals.length})`}>
                  <ul className="grid gap-2">
                    {payload.proposals.map((p, idx) => (
                      <li
                        key={`${p.canonicalId}-${idx}`}
                        className="rounded-lg border border-trade-border-subtle bg-trade-bg-page px-3 py-2"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-[13px] font-semibold text-trade-text-primary">
                            {p.canonicalId}
                          </span>
                          <span className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-trade-text-muted">
                            {p.regime}
                          </span>
                          <ConfidencePill confidence={p.confidence} />
                          <span className="ml-auto text-[10.5px] text-trade-text-muted">
                            {p.source}
                          </span>
                        </div>
                        <p className="mt-1 text-[12px] text-trade-text-secondary">
                          {p.title}
                        </p>
                        <p className="mt-1 text-[11.5px] text-trade-text-muted">
                          {p.rationale}
                        </p>
                        <p className="mt-1 text-[10.5px] font-mono text-trade-text-muted">
                          {p.citation}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {payload.evidence.length > 0 && (
                <Section title={`Evidence (${payload.evidence.length})`}>
                  <ul className="grid gap-1.5">
                    {payload.evidence.map((e, idx) => (
                      <li
                        key={`${e.attribute}-${idx}`}
                        className="rounded-md border border-trade-border-subtle bg-trade-bg-page px-3 py-1.5 text-[11.5px]"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono font-semibold text-trade-text-primary">
                            {e.attribute}
                          </span>
                          <span className="text-trade-text-muted">→</span>
                          <span className="text-trade-text-primary">
                            {String(e.parsedValue)}
                          </span>
                        </div>
                        <p className="mt-1 text-trade-text-muted">
                          <span className="opacity-60">…{e.contextBefore}</span>
                          <span className="rounded bg-trade-accent-soft px-1 font-mono text-trade-accent-strong">
                            {e.quote}
                          </span>
                          <span className="opacity-60">{e.contextAfter}…</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {payload.attributesNeeded.length > 0 && (
                <Section title="Attributes still needed">
                  <p className="mb-1 text-[11.5px] text-trade-text-muted">
                    Fill these in on the item record to refine the
                    classification.
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {payload.attributesNeeded.map((a) => (
                      <li
                        key={a}
                        className="rounded bg-trade-bg-subtle px-2 py-0.5 font-mono text-[11px] text-trade-text-secondary"
                      >
                        {a}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              <Section title="Disclaimer">
                <p className="trade-chip-warn rounded-md px-3 py-2 text-[11.5px] leading-[1.5]">
                  {payload.disclaimer}
                </p>
              </Section>
            </>
          ) : (
            <p className="text-[12.5px] text-trade-text-muted">
              Draft payload unavailable. Refresh the page to reload from the
              database.
            </p>
          )}

          {isPending && canEdit && (
            <Section title="Review note (optional)">
              <textarea
                className="h-[64px] w-full resize-none rounded-md border border-trade-border bg-trade-bg-page px-3 py-2 text-[12.5px] text-trade-text-primary placeholder:text-trade-text-muted outline-none transition focus:border-trade-accent focus:ring-2 focus:ring-trade-accent/30"
                placeholder="Why you're accepting / modifying / rejecting — captured on the audit trail."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Section>
          )}
        </div>

        {isPending && canEdit && (
          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-trade-border-subtle bg-trade-bg-page px-5 py-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => submitDecision("REJECTED")}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium text-trade-accent-danger transition hover:bg-trade-hover disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => submitDecision("MODIFIED")}
              className="inline-flex items-center gap-1.5 rounded-md border border-trade-border bg-trade-bg-panel px-3 py-1.5 text-[12.5px] font-medium text-trade-text-primary transition hover:bg-trade-hover disabled:opacity-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              Modify
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => submitDecision("ACCEPTED")}
              className="inline-flex items-center gap-1.5 rounded-md bg-trade-accent px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-trade-accent-strong disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Accept
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

// ─── Small primitives ──────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
        {title}
      </h3>
      {children}
    </div>
  );
}

interface BannerProps {
  icon: LucideIcon;
  tone: "success" | "error";
  message: string;
  onDismiss: () => void;
}

function Banner({ icon: Icon, tone, message, onDismiss }: BannerProps) {
  const toneClass =
    tone === "success" ? "trade-chip-success" : "trade-chip-danger";
  return (
    <div
      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[12.5px] ${toneClass}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded p-0.5 transition hover:bg-trade-hover"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

const DECISION_CONFIG: Record<
  Decision,
  { label: string; className: string; Icon: LucideIcon }
> = {
  PENDING: {
    label: "Pending",
    className: "trade-chip-warn",
    Icon: Clock,
  },
  ACCEPTED: {
    label: "Accepted",
    className: "trade-chip-success",
    Icon: CheckCircle2,
  },
  REJECTED: {
    label: "Rejected",
    className: "trade-chip-danger",
    Icon: XCircle,
  },
  MODIFIED: {
    label: "Modified",
    className:
      "bg-trade-accent-soft text-trade-accent-strong ring-1 ring-trade-accent/30",
    Icon: Pencil,
  },
};

function DecisionBadge({ decision }: { decision: Decision }) {
  const cfg = DECISION_CONFIG[decision];
  const Icon = cfg.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${cfg.className}`}
    >
      <Icon className="h-2.5 w-2.5" strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

function ConfidencePill({ confidence }: { confidence: string }) {
  const tone =
    confidence === "HIGH"
      ? "trade-chip-success"
      : confidence === "MEDIUM"
        ? "trade-chip-warn"
        : "trade-chip-neutral";
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${tone}`}
    >
      {confidence}
    </span>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Best-effort parse of a persisted draft JSON blob into the typed
 * `ClassificationDraft` shape. Returns `null` on shape mismatch so
 * the modal can render a "payload unavailable" fallback instead of
 * crashing.
 */
function parseEvidence(raw: unknown): ClassificationDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<ClassificationDraft>;
  if (
    !Array.isArray(obj.proposals) ||
    !Array.isArray(obj.evidence) ||
    typeof obj.disclaimer !== "string"
  ) {
    return null;
  }
  return obj as ClassificationDraft;
}
