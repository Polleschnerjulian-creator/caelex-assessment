"use client";

import * as React from "react";
import {
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Wrench,
  MessageSquare,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/v2/card";
import { Badge } from "@/components/ui/v2/badge";
import { Button } from "@/components/ui/v2/button";
import { rejectProposalAction } from "@/app/dashboard/proposals/server-actions";
// Sprint 6D — EU AI Act Art. 14 anti-rubber-stamping surfaces.
import { ProposalReviewGate } from "./ProposalReviewGate";
import { validateCitations } from "@/lib/astra/citation-validator";
import { AIMessageFooter } from "@/components/astra-v2/AIMessageFooter";
import type { V2CitationCheck } from "@/lib/comply-v2/astra-engine.server";

/**
 * Shape of one entry in the proposal's decisionLog. Mirrors
 * `ProposalDecisionLogEntry` from the action layer but kept loose
 * here so the renderer survives shape drift in older rows.
 */
interface DecisionLogEntry {
  kind?: "tool" | "thought" | string;
  tool?: string;
  input?: unknown;
  result?: unknown;
  text?: string;
}

function isDecisionLogArray(value: unknown): value is DecisionLogEntry[] {
  return (
    Array.isArray(value) &&
    value.every((v) => v !== null && typeof v === "object")
  );
}

export interface ProposalCardProps {
  proposal: {
    id: string;
    actionName: string;
    actionLabel: string;
    actionDescription: string | null;
    params: unknown;
    status: "PENDING" | "APPLIED" | "REJECTED" | "EXPIRED";
    itemId: string | null;
    rationale: string | null;
    reviewerNote: string | null;
    /** Astra's chain-of-thought leading to this proposal, or null for
     *  user-initiated proposals. */
    decisionLog: unknown;
    createdAt: string;
    expiresAt: string;
    decidedAt: string | null;
    /**
     * Sprint 6B reproducibility fields. Optional — pre-6B rows have
     * NULL for all three. Surfaced on the card as a footer strip
     * when present so the reviewer can see "this came from
     * claude-sonnet-4-6 / engine v2.3 / 2 hours ago".
     */
    modelName?: string | null;
    engineVersion?: string | null;
    reproducibility?: {
      modelName: string;
      engineVersion: string;
      temperature: number;
      maxTokens: number;
      systemPromptHash: string;
      userMessageHash: string;
      contextHash: string;
      conversationId: string | null;
      messageId: string | null;
      capturedAt: string;
    } | null;
  };
}

/**
 * Astra proposal card — the Stripe-Radar-pattern detail card.
 *
 * Two structured panels (Astra reasoning + parameters) and 2-3 fixed
 * actions (Approve / Reject / Reject-with-note).
 *
 * For non-pending proposals, the card collapses to summary-only with
 * the decision result and reviewer note.
 */
export function ProposalCard({ proposal }: ProposalCardProps) {
  const [paramsOpen, setParamsOpen] = React.useState(false);
  const [logOpen, setLogOpen] = React.useState(false);
  const [showRejectInput, setShowRejectInput] = React.useState(false);
  const isPending = proposal.status === "PENDING";

  const decisionLog = isDecisionLogArray(proposal.decisionLog)
    ? proposal.decisionLog
    : [];

  const tone =
    proposal.status === "APPLIED"
      ? "emerald"
      : proposal.status === "REJECTED"
        ? "slate"
        : isPending
          ? "amber"
          : "slate";

  return (
    <Card tone={tone} className="flex flex-col p-4">
      <CardHeader className="p-0 pb-3 space-y-1">
        <div className="mb-2 flex items-start justify-between gap-3">
          <Badge variant={statusBadgeVariant(proposal.status)}>
            {proposal.status}
          </Badge>
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">
            {proposal.actionName}
          </span>
        </div>
        <CardTitle className="text-[15px] leading-snug text-slate-100">
          {proposal.actionLabel}
        </CardTitle>
        {proposal.actionDescription ? (
          <CardDescription className="text-[11px] leading-relaxed text-slate-500">
            {proposal.actionDescription}
          </CardDescription>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 p-0">
        {proposal.itemId ? (
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
            <Sparkles className="h-3 w-3 text-emerald-400" />
            TARGET{" "}
            <code className="font-mono text-[11px] tracking-normal text-emerald-300">
              {proposal.itemId}
            </code>
          </div>
        ) : null}

        {proposal.rationale ? (
          <section className="rounded-md bg-white/[0.02] p-3 ring-1 ring-inset ring-white/[0.06]">
            <div className="mb-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-slate-500">
              RATIONALE
            </div>
            <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-slate-300">
              {proposal.rationale}
            </p>
          </section>
        ) : null}

        {decisionLog.length > 0 ? (
          <div className="rounded-md bg-emerald-500/[0.04] p-3 ring-1 ring-inset ring-emerald-500/20">
            <button
              type="button"
              onClick={() => setLogOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-emerald-400" />
                <span className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-emerald-300">
                  ASTRA REASONING · {decisionLog.length} STEP
                  {decisionLog.length === 1 ? "" : "S"}
                </span>
              </span>
              {logOpen ? (
                <ChevronDown className="h-3 w-3 text-emerald-400" />
              ) : (
                <ChevronRight className="h-3 w-3 text-emerald-400" />
              )}
            </button>
            {logOpen ? (
              <ol className="mt-3 space-y-2 border-t border-emerald-500/15 pt-3">
                {decisionLog.map((entry, idx) => (
                  <DecisionLogStep key={idx} index={idx} entry={entry} />
                ))}
              </ol>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setParamsOpen((o) => !o)}
          className="inline-flex items-center gap-1 self-start font-mono text-[10px] uppercase tracking-wider text-slate-500 transition hover:text-slate-300"
        >
          {paramsOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          PARAMETERS
        </button>
        {paramsOpen ? (
          <pre className="overflow-x-auto rounded-md bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-emerald-200 ring-1 ring-inset ring-white/[0.06]">
            {JSON.stringify(proposal.params, null, 2)}
          </pre>
        ) : null}

        {proposal.reviewerNote ? (
          <section className="rounded-md bg-amber-500/[0.06] p-3 ring-1 ring-inset ring-amber-500/30">
            <div className="mb-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-amber-300">
              REVIEWER NOTE
            </div>
            <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-amber-100">
              {proposal.reviewerNote}
            </p>
          </section>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            PROPOSED {formatRelative(proposal.createdAt)}
          </span>
          {isPending ? (
            <span className="inline-flex items-center gap-1 text-amber-400">
              EXPIRES {formatRelative(proposal.expiresAt)}
            </span>
          ) : proposal.decidedAt ? (
            <span className="inline-flex items-center gap-1">
              DECIDED {formatRelative(proposal.decidedAt)}
            </span>
          ) : null}
        </div>

        {/* Sprint 6D — Reproducibility metadata (model, engine,
            captured-at) plus citation-validator warning when the
            proposal's rationale contains unverified regulatory
            references. Both are surfaced unconditionally on every
            card so the reviewer sees them at a glance. */}
        {isPending && proposal.rationale ? (
          <RationaleCitationWarning rationale={proposal.rationale} />
        ) : null}
        {(proposal.modelName || proposal.engineVersion) && isPending ? (
          <ReproducibilityStrip
            modelName={proposal.modelName ?? null}
            engineVersion={proposal.engineVersion ?? null}
            capturedAt={proposal.reproducibility?.capturedAt ?? null}
            promptHash={proposal.reproducibility?.systemPromptHash ?? null}
          />
        ) : null}

        {isPending ? (
          <div className="mt-2 flex flex-col gap-3 border-t border-white/[0.06] pt-3">
            <ProposalReviewGate proposalId={proposal.id} />

            {!showRejectInput ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRejectInput(true)}
                className="self-start"
              >
                <XCircle />
                Reject…
              </Button>
            ) : (
              <form
                action={rejectProposalAction}
                className="flex w-full flex-col gap-2 sm:flex-row"
              >
                <input type="hidden" name="proposalId" value={proposal.id} />
                <input
                  name="reviewerNote"
                  type="text"
                  placeholder="Optional reason for rejection"
                  className="flex-1 rounded bg-white/[0.04] px-2.5 py-1 text-[12px] text-slate-100 placeholder:text-slate-500 ring-1 ring-inset ring-white/[0.08] focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                  maxLength={500}
                />
                <Button type="submit" variant="danger" size="sm">
                  <XCircle />
                  Reject
                </Button>
              </form>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Sprint 6D — Surfaces the citation-validator's verdict on the
 * proposal's rationale text. Reuses AIMessageFooter so the visual
 * language is identical to the chat surface.
 */
function RationaleCitationWarning({ rationale }: { rationale: string }) {
  const result = React.useMemo(() => validateCitations(rationale), [rationale]);
  if (result.total === 0) return null;
  const cc: V2CitationCheck = {
    total: result.total,
    verifiedCount: result.verified.length,
    unverifiedCount: result.unverified.length,
    unverifiedSample: result.unverified.slice(0, 3).map((c) => ({
      raw: c.raw,
      regulation: c.regulation,
      article: c.article,
    })),
  };
  // Hide the always-on AI-generated label here — the proposal-card
  // header already says "Astra reasoning" and we don't need a second
  // disclosure layer per card. Only show when there are unverified.
  if (cc.unverifiedCount === 0) return null;
  return <AIMessageFooter citationCheck={cc} />;
}

/**
 * Sprint 6D — Reproducibility metadata strip. Compact one-line
 * summary so the reviewer can see what generated the proposal at a
 * glance. Full hashes available on hover (tooltip via title attr).
 */
function ReproducibilityStrip({
  modelName,
  engineVersion,
  capturedAt,
  promptHash,
}: {
  modelName: string | null;
  engineVersion: string | null;
  capturedAt: string | null;
  promptHash: string | null;
}) {
  return (
    <div
      data-testid="reproducibility-strip"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded bg-white/[0.02] px-2 py-1.5 font-mono text-[9px] uppercase tracking-wider text-slate-500 ring-1 ring-inset ring-white/[0.04]"
    >
      <span className="font-medium text-slate-400">PROVENANCE</span>
      {modelName ? (
        <span data-testid="provenance-model">
          model <span className="text-slate-300">{modelName}</span>
        </span>
      ) : null}
      {engineVersion ? (
        <span data-testid="provenance-engine">
          engine <span className="text-slate-300">{engineVersion}</span>
        </span>
      ) : null}
      {capturedAt ? (
        <span data-testid="provenance-captured">
          captured{" "}
          <span className="text-slate-300">
            {new Date(capturedAt).toISOString().slice(0, 16).replace("T", " ")}
          </span>
        </span>
      ) : null}
      {promptHash ? (
        <span
          data-testid="provenance-hash"
          title={`Full SHA-256: ${promptHash}`}
          className="cursor-help"
        >
          hash <span className="text-slate-300">{promptHash.slice(0, 8)}…</span>
        </span>
      ) : null}
    </div>
  );
}

function DecisionLogStep({
  index,
  entry,
}: {
  index: number;
  entry: DecisionLogEntry;
}) {
  const isTool = entry.kind === "tool";
  const result = entry.result;
  const resultOk =
    typeof result === "object" &&
    result !== null &&
    "ok" in result &&
    (result as { ok: unknown }).ok === true;
  const resultError =
    typeof result === "object" &&
    result !== null &&
    "ok" in result &&
    (result as { ok: unknown }).ok === false;
  const isProposal =
    resultOk &&
    typeof (result as unknown as { data?: unknown }).data === "object" &&
    (result as unknown as { data?: { status?: unknown } }).data !== null &&
    (
      (result as unknown as { data?: { status?: unknown } }).data as
        | { status?: unknown }
        | undefined
    )?.status === "PROPOSED";

  return (
    <li className="flex items-start gap-2 text-xs leading-relaxed">
      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-emerald-500/15 font-mono text-[9px] font-bold tabular-nums text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        {isTool ? (
          <div>
            <div className="flex items-center gap-1.5">
              <Wrench className="h-3 w-3 text-emerald-400" />
              <span className="font-mono text-[11px] font-medium text-slate-200">
                {entry.tool ?? "(unknown tool)"}
              </span>
              {resultOk ? (
                isProposal ? (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-amber-400">
                    queued
                  </span>
                ) : (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-400">
                    ok
                  </span>
                )
              ) : resultError ? (
                <span className="font-mono text-[9px] uppercase tracking-wider text-red-400">
                  failed
                </span>
              ) : null}
            </div>
            {entry.input !== undefined ? (
              <details className="mt-0.5 text-[10px] text-slate-500">
                <summary className="cursor-pointer select-none font-mono uppercase tracking-wider">
                  input
                </summary>
                <pre className="mt-1 overflow-x-auto rounded bg-black/40 px-2 py-1 font-mono leading-relaxed text-emerald-200 ring-1 ring-inset ring-white/[0.06]">
                  {JSON.stringify(entry.input, null, 2)}
                </pre>
              </details>
            ) : null}
            {resultError ? (
              <p className="mt-0.5 text-[10px] text-red-400">
                {String(
                  (result as { error?: unknown })?.error ?? "Unknown error",
                )}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex items-start gap-1.5">
            <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" />
            <p className="whitespace-pre-wrap text-slate-300">
              {entry.text ?? ""}
            </p>
          </div>
        )}
      </div>
    </li>
  );
}

function statusBadgeVariant(status: ProposalCardProps["proposal"]["status"]) {
  switch (status) {
    case "APPLIED":
      return "attested";
    case "REJECTED":
      return "expired";
    case "EXPIRED":
      return "outline";
    case "PENDING":
    default:
      return "underReview";
  }
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = date.getTime() - Date.now();
  const sign = diffMs >= 0 ? "in" : "ago";
  const absSec = Math.abs(diffMs) / 1000;
  const minute = 60;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (absSec < minute) return sign === "in" ? "in moments" : "just now";
  if (absSec < hour) {
    const m = Math.round(absSec / minute);
    return sign === "in" ? `in ${m}m` : `${m}m ago`;
  }
  if (absSec < day) {
    const h = Math.round(absSec / hour);
    return sign === "in" ? `in ${h}h` : `${h}h ago`;
  }
  const d = Math.round(absSec / day);
  return sign === "in" ? `in ${d}d` : `${d}d ago`;
}
