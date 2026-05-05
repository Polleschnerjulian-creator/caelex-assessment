"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  MoreHorizontal,
  Clock,
  BellRing,
  Pencil,
  ShieldCheck,
  ExternalLink,
  Upload,
  Radio,
  ListChecks,
  FileSignature,
  UserPlus,
  Hourglass,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/v2/card";
import { Badge } from "@/components/ui/v2/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
} from "@/components/ui/v2/popover";
import {
  type ComplianceItem,
  type ComplianceStatus,
  REGULATION_LABELS,
} from "@/lib/comply-v2/types";
import { deriveNextStep, type NextStepKind } from "@/lib/comply-v2/next-step";
import {
  snoozeAction,
  unsnoozeAction,
  addNoteAction,
  markAttestedAction,
} from "@/app/dashboard/today/server-actions";

/**
 * Interactive ComplianceItemCard for the Today inbox.
 *
 * Server-side data, client-side actions. The Today page (Server
 * Component) fetches and passes ComplianceItem objects + their snooze
 * state. This card provides the action menu — Snooze 7d / Snooze 30d
 * / Wake / Add note.
 *
 * Each menu item is a `<form>` with a Server Action, so submitting
 * doesn't ship the action handler to the client. Form submission
 * triggers revalidatePath in the action so the inbox refreshes.
 */

const STATUS_LABELS: Record<ComplianceStatus, string> = {
  PENDING: "Pending",
  DRAFT: "Draft",
  EVIDENCE_REQUIRED: "Evidence req.",
  UNDER_REVIEW: "Under review",
  ATTESTED: "Attested",
  EXPIRED: "Expired",
  NOT_APPLICABLE: "N/A",
};

function statusVariant(status: ComplianceStatus) {
  switch (status) {
    case "PENDING":
      return "pending";
    case "DRAFT":
      return "draft";
    case "EVIDENCE_REQUIRED":
      return "evidenceRequired";
    case "UNDER_REVIEW":
      return "underReview";
    case "ATTESTED":
      return "attested";
    case "EXPIRED":
      return "expired";
    case "NOT_APPLICABLE":
      return "outline";
    default:
      return "default";
  }
}

export interface ComplianceItemCardProps {
  item: ComplianceItem;
  /** ISO date when this item is snoozed-until, or null if not snoozed. */
  snoozedUntil: string | null;
}

// Sprint 1.2: icon registry for the NextStep CTA. Keeps the icon
// choice in one place — the next-step.ts module exposes the kind +
// the name, the card maps the name to the lucide component.
const NEXT_STEP_ICONS: Record<NextStepKind, LucideIcon> = {
  UPLOAD_EVIDENCE: Upload,
  CONNECT_SENTINEL: Radio,
  RUN_ASSESSMENT: ListChecks,
  REVIEW_DRAFT: FileSignature,
  ATTEST: ShieldCheck,
  REQUEST_FROM_TEAM: UserPlus,
  WAIT_FOR_APPROVAL: Hourglass,
};

export function ComplianceItemCard({
  item,
  snoozedUntil,
}: ComplianceItemCardProps) {
  const [open, setOpen] = React.useState(false);
  const noteSnippet =
    item.notes?.slice(0, 140) || item.evidenceNotes?.slice(0, 140);

  const isSnoozed = Boolean(snoozedUntil);
  const detailHref = `/dashboard/items/${item.regulation}/${item.rowId}`;

  // Sprint 1.2: replace the opaque status pill with a concrete next-
  // step CTA. tone drives the card border colour so URGENT actions
  // visually pop.
  const nextStep = deriveNextStep(item);
  const NextStepIcon = NEXT_STEP_ICONS[nextStep.kind];
  const tone = nextStep.tone === "amber" ? "emerald" : nextStep.tone;

  return (
    <Card tone={tone} className="group/card relative flex flex-col p-3">
      <CardHeader className="p-0 pb-2 space-y-1">
        <div className="mb-1 flex items-start justify-between gap-2">
          <Badge variant={statusVariant(item.status)}>
            {STATUS_LABELS[item.status]}
          </Badge>
          <div className="flex items-center gap-0.5">
            <Link
              href={detailHref}
              aria-label="Open item detail"
              className="rounded p-1 text-slate-500 opacity-0 transition group-hover/card:opacity-100 hover:bg-white/[0.06] hover:text-emerald-300 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/50"
            >
              <ExternalLink className="h-3 w-3" />
            </Link>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
              {item.regulation}
            </span>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Open item actions"
                  className="rounded p-1 text-slate-500 opacity-0 transition group-hover/card:opacity-100 hover:bg-white/[0.06] hover:text-slate-200 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/50"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-1">
                <MenuLabel>Item actions</MenuLabel>

                {!isSnoozed ? (
                  <>
                    <form action={snoozeAction}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="days" value="7" />
                      <MenuItem>
                        <Clock />
                        Snooze 7 days
                      </MenuItem>
                    </form>
                    <form action={snoozeAction}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="days" value="30" />
                      <MenuItem>
                        <Clock />
                        Snooze 30 days
                      </MenuItem>
                    </form>
                  </>
                ) : (
                  <form action={unsnoozeAction}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <MenuItem>
                      <BellRing />
                      Wake item now
                    </MenuItem>
                  </form>
                )}

                <MenuSeparator />

                {item.status !== "ATTESTED" ? (
                  <form
                    action={markAttestedAction}
                    onSubmit={(e) => {
                      const form = e.currentTarget;
                      const summary = window.prompt(
                        "Briefly summarize the evidence supporting attestation (≥10 chars):",
                      );
                      if (!summary || summary.trim().length < 10) {
                        e.preventDefault();
                        return;
                      }
                      const input = form.elements.namedItem(
                        "evidenceSummary",
                      ) as HTMLInputElement | null;
                      if (input) input.value = summary;
                      const rationale = form.elements.namedItem(
                        "_rationale",
                      ) as HTMLInputElement | null;
                      if (rationale)
                        rationale.value = `User-initiated attestation request. Evidence: ${summary.slice(0, 200)}`;
                      setOpen(false);
                    }}
                  >
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="evidenceSummary" value="" />
                    <input type="hidden" name="_itemId" value={item.id} />
                    <input type="hidden" name="_rationale" value="" />
                    <MenuItem>
                      <ShieldCheck />
                      Mark as attested…
                      <span className="ml-auto text-[10px] text-amber-600 dark:text-amber-400">
                        needs approval
                      </span>
                    </MenuItem>
                  </form>
                ) : null}

                <form
                  action={addNoteAction}
                  onSubmit={(e) => {
                    const form = e.currentTarget;
                    const body = window.prompt("Add a note:");
                    if (!body || body.trim().length === 0) {
                      e.preventDefault();
                      return;
                    }
                    const input = form.elements.namedItem(
                      "body",
                    ) as HTMLInputElement | null;
                    if (input) input.value = body;
                    setOpen(false);
                  }}
                >
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="body" value="" />
                  <MenuItem>
                    <Pencil />
                    Add note…
                  </MenuItem>
                </form>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <CardTitle className="text-[13px] font-mono leading-snug tracking-tight">
          <Link
            href={detailHref}
            className="text-slate-100 transition hover:text-emerald-300"
          >
            {item.requirementId}
          </Link>
        </CardTitle>
        <CardDescription className="text-[11px] text-slate-500">
          {REGULATION_LABELS[item.regulation]}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-1">
        {noteSnippet ? (
          <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-400">
            {noteSnippet}
          </p>
        ) : (
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-600">
            {"// no notes"}
          </p>
        )}

        {/* Sprint 1.2: Next-Step CTA. Primary action for the user
            on this item — replaces "stare at status pill, click into
            detail page, figure out what to do" with one click. */}
        <NextStepCta
          href={nextStep.href}
          label={nextStep.ctaLabel}
          helper={nextStep.helper}
          tone={nextStep.tone}
          selfActionable={nextStep.selfActionable}
          Icon={NextStepIcon}
        />

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/[0.04] pt-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
          {item.targetDate ? (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(item.targetDate).toLocaleDateString()}
            </span>
          ) : null}
          {isSnoozed ? (
            <span className="inline-flex items-center gap-1 text-amber-400">
              <Clock className="h-3 w-3" />
              SNOOZED · {new Date(snoozedUntil!).toLocaleDateString()}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Renders the Sprint-1.2 primary CTA on each card. Three tones:
 *   emerald  — user-actionable, high-visibility (URGENT-bucket items)
 *   amber    — user-actionable, urgent-attention (EXPIRED items)
 *   slate    — informational or waiting-on-someone-else
 *
 * `selfActionable=false` reduces opacity so the user sees at a glance
 * "this isn't on me right now."
 */
function NextStepCta({
  href,
  label,
  helper,
  tone,
  selfActionable,
  Icon,
}: {
  href: string;
  label: string;
  helper: string;
  tone: "emerald" | "amber" | "slate";
  selfActionable: boolean;
  Icon: LucideIcon;
}) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-500/15 text-amber-200 ring-amber-500/40 hover:bg-amber-500/25 hover:text-amber-100"
      : tone === "emerald"
        ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/40 hover:bg-emerald-500/25 hover:text-emerald-100"
        : "bg-white/[0.04] text-slate-300 ring-white/10 hover:bg-white/[0.08] hover:text-slate-100";

  return (
    <Link
      href={href}
      className={`mt-2 group/cta block rounded-md px-2.5 py-2 ring-1 ring-inset transition ${toneClass} ${selfActionable ? "" : "opacity-60 hover:opacity-100"}`}
      aria-label={`${label} — ${helper}`}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider">
          {label}
        </span>
        <ExternalLink className="ml-auto h-3 w-3 opacity-0 transition group-hover/cta:opacity-100" />
      </div>
      <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-slate-400">
        {helper}
      </p>
    </Link>
  );
}
