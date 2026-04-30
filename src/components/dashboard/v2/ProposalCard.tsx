"use client";

import * as React from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Sparkles,
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
import {
  applyProposalAction,
  rejectProposalAction,
} from "@/app/dashboard/proposals/server-actions";

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
    createdAt: string;
    expiresAt: string;
    decidedAt: string | null;
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
  const [showRejectInput, setShowRejectInput] = React.useState(false);
  const isPending = proposal.status === "PENDING";

  const tone =
    proposal.status === "APPLIED"
      ? "emerald"
      : proposal.status === "REJECTED"
        ? "slate"
        : isPending
          ? "amber"
          : "slate";

  return (
    <Card tone={tone} className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="mb-2 flex items-start justify-between gap-3">
          <Badge variant={statusBadgeVariant(proposal.status)}>
            {proposal.status}
          </Badge>
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
            {proposal.actionName}
          </span>
        </div>
        <CardTitle className="leading-snug">{proposal.actionLabel}</CardTitle>
        {proposal.actionDescription ? (
          <CardDescription className="text-xs leading-relaxed">
            {proposal.actionDescription}
          </CardDescription>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 pb-4 pt-0">
        {proposal.itemId ? (
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <Sparkles className="h-3 w-3 text-emerald-500" />
            Targets <code className="font-mono text-xs">{proposal.itemId}</code>
          </div>
        ) : null}

        {proposal.rationale ? (
          <section className="rounded-md border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Rationale
            </div>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              {proposal.rationale}
            </p>
          </section>
        ) : null}

        <button
          type="button"
          onClick={() => setParamsOpen((o) => !o)}
          className="inline-flex items-center gap-1 self-start text-[11px] text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          {paramsOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          Parameters
        </button>
        {paramsOpen ? (
          <pre className="overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed dark:border-slate-800 dark:bg-slate-900">
            {JSON.stringify(proposal.params, null, 2)}
          </pre>
        ) : null}

        {proposal.reviewerNote ? (
          <section className="rounded-md border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-700/40 dark:bg-amber-950/20">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Reviewer note
            </div>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-amber-900 dark:text-amber-100">
              {proposal.reviewerNote}
            </p>
          </section>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Proposed {formatRelative(proposal.createdAt)}
          </span>
          {isPending ? (
            <span className="inline-flex items-center gap-1">
              Expires {formatRelative(proposal.expiresAt)}
            </span>
          ) : proposal.decidedAt ? (
            <span className="inline-flex items-center gap-1">
              Decided {formatRelative(proposal.decidedAt)}
            </span>
          ) : null}
        </div>

        {isPending ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
            <form action={applyProposalAction}>
              <input type="hidden" name="proposalId" value={proposal.id} />
              <Button type="submit" variant="emerald" size="sm">
                <CheckCircle2 />
                Approve
              </Button>
            </form>

            {!showRejectInput ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRejectInput(true)}
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
                  className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
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
