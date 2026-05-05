"use client";

import * as React from "react";
import Link from "next/link";
import {
  MoreHorizontal,
  Clock,
  BellRing,
  Pencil,
  ShieldCheck,
  ArrowUpRight,
  Upload,
  Radio,
  ListChecks,
  FileSignature,
  UserPlus,
  Hourglass,
  type LucideIcon,
} from "lucide-react";
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
 * ComplianceItemCard — Today inbox row, Linear-app aesthetic.
 *
 * Visual hierarchy (top→bottom of importance):
 *   1. Title (regulation label · article id)
 *   2. Primary action button (single dark CTA)
 *   3. Notes snippet
 *   4. Meta row: status dot + due date + snoozed badge
 *   5. Hover-revealed actions menu (top-right)
 *
 * Card surface = white in light mode, slate-950 in dark mode, with a
 * single hairline border. Hover lifts the border + adds a soft shadow.
 * No tone-based card backgrounds — status lives in the dot only.
 */

const STATUS_LABELS: Record<ComplianceStatus, string> = {
  PENDING: "Pending",
  DRAFT: "Draft",
  EVIDENCE_REQUIRED: "Evidence required",
  UNDER_REVIEW: "Under review",
  ATTESTED: "Attested",
  EXPIRED: "Expired",
  NOT_APPLICABLE: "Not applicable",
};

/**
 * Single colored dot per status — matches the tone of the action.
 * Red = blocking (Expired). Amber = needs you (Evidence required).
 * Blue = drafting. Violet = waiting. Emerald = done. Slate = idle/N-A.
 */
const STATUS_DOT_CLASS: Record<ComplianceStatus, string> = {
  EXPIRED: "bg-red-500",
  EVIDENCE_REQUIRED: "bg-amber-500",
  PENDING: "bg-slate-400",
  DRAFT: "bg-blue-500",
  UNDER_REVIEW: "bg-violet-500",
  ATTESTED: "bg-emerald-500",
  NOT_APPLICABLE: "bg-slate-300 dark:bg-slate-600",
};

const NEXT_STEP_ICONS: Record<NextStepKind, LucideIcon> = {
  UPLOAD_EVIDENCE: Upload,
  CONNECT_SENTINEL: Radio,
  RUN_ASSESSMENT: ListChecks,
  REVIEW_DRAFT: FileSignature,
  ATTEST: ShieldCheck,
  REQUEST_FROM_TEAM: UserPlus,
  WAIT_FOR_APPROVAL: Hourglass,
};

export interface ComplianceItemCardProps {
  item: ComplianceItem;
  /** ISO date when this item is snoozed-until, or null if not snoozed. */
  snoozedUntil: string | null;
}

/**
 * Format a target date in Linear's style:
 *   today        → "Today"
 *   tomorrow     → "Tomorrow"
 *   in 2-7 days  → "in Nd"
 *   future       → "9 May" (no year if same year)
 *   past         → "Overdue · 9 May" (rendered red by caller)
 */
function formatDueDate(iso: Date | string): {
  label: string;
  overdue: boolean;
} {
  const target = typeof iso === "string" ? new Date(iso) : iso;
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  const diffMs = startOfTarget.getTime() - startOfToday.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { label: "Today", overdue: false };
  if (diffDays === 1) return { label: "Tomorrow", overdue: false };
  if (diffDays > 1 && diffDays <= 7) {
    return { label: `in ${diffDays}d`, overdue: false };
  }
  if (diffDays < 0) {
    const dateLabel = target.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
    return { label: `Overdue · ${dateLabel}`, overdue: true };
  }
  const sameYear = target.getFullYear() === now.getFullYear();
  return {
    label: target.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      ...(sameYear ? {} : { year: "numeric" }),
    }),
    overdue: false,
  };
}

export function ComplianceItemCard({
  item,
  snoozedUntil,
}: ComplianceItemCardProps) {
  const [open, setOpen] = React.useState(false);
  const noteSnippet =
    item.notes?.slice(0, 160) || item.evidenceNotes?.slice(0, 160);

  const isSnoozed = Boolean(snoozedUntil);
  const detailHref = `/dashboard/items/${item.regulation}/${item.rowId}`;

  const nextStep = deriveNextStep(item);
  const NextStepIcon = NEXT_STEP_ICONS[nextStep.kind];

  const due = item.targetDate ? formatDueDate(item.targetDate) : null;
  const regulationLabel = REGULATION_LABELS[item.regulation];

  return (
    <article
      className={[
        "group/card relative",
        "flex flex-col gap-3 rounded-lg p-4",
        "border border-slate-200 bg-white",
        "dark:border-slate-800 dark:bg-slate-950/40",
        "transition-all duration-150",
        "hover:border-slate-300 hover:shadow-sm",
        "dark:hover:border-slate-700 dark:hover:bg-slate-900/60",
      ].join(" ")}
    >
      {/* Header: title + hidden actions */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={detailHref}
            className="block text-[13px] font-semibold leading-snug text-slate-900 transition hover:text-slate-700 dark:text-slate-100 dark:hover:text-white"
          >
            {regulationLabel}
            <span className="ml-1.5 font-mono text-[12px] font-normal text-slate-500 dark:text-slate-500">
              {item.requirementId}
            </span>
          </Link>
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Item actions"
              className="rounded p-1 text-slate-400 opacity-0 transition group-hover/card:opacity-100 hover:bg-slate-100 hover:text-slate-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
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
      </header>

      {/* Notes snippet (or quiet placeholder) */}
      {noteSnippet ? (
        <p className="line-clamp-2 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-400">
          {noteSnippet}
        </p>
      ) : null}

      {/* Primary action — Linear-style dark button + helper line */}
      <NextStepCta
        href={nextStep.href}
        label={nextStep.ctaLabel}
        helper={nextStep.helper}
        selfActionable={nextStep.selfActionable}
        Icon={NextStepIcon}
      />

      {/* Footer meta: status dot · status label · separator · due date · snoozed */}
      <footer className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_CLASS[item.status]}`}
          />
          <span className="text-slate-600 dark:text-slate-400">
            {STATUS_LABELS[item.status]}
          </span>
        </span>

        {due ? (
          <>
            <span aria-hidden className="text-slate-300 dark:text-slate-700">
              ·
            </span>
            <span
              className={
                due.overdue
                  ? "font-medium text-red-600 dark:text-red-400"
                  : "text-slate-500 dark:text-slate-400"
              }
            >
              {due.label}
            </span>
          </>
        ) : null}

        {isSnoozed ? (
          <>
            <span aria-hidden className="text-slate-300 dark:text-slate-700">
              ·
            </span>
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Clock className="h-3 w-3" />
              Snoozed ·{" "}
              {new Date(snoozedUntil!).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
              })}
            </span>
          </>
        ) : null}
      </footer>
    </article>
  );
}

/**
 * Linear-style primary action — dark slate button with the next-step
 * label and a small helper line underneath. No tone-based card colors;
 * `selfActionable=false` switches to a neutral outline button so it
 * visually says "this is informational, not on me right now."
 */
function NextStepCta({
  href,
  label,
  helper,
  selfActionable,
  Icon,
}: {
  href: string;
  label: string;
  helper: string;
  selfActionable: boolean;
  Icon: LucideIcon;
}) {
  const buttonClass = selfActionable
    ? // Primary: dark filled button (Linear's signature CTA style)
      "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
    : // Secondary: outlined neutral (waiting / informational)
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-900";

  return (
    <div className="flex flex-col gap-1.5">
      <Link
        href={href}
        className={[
          "group/cta inline-flex items-center gap-1.5 self-start rounded-md px-2.5 py-1.5",
          "text-[12px] font-medium",
          "transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-950",
          buttonClass,
        ].join(" ")}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        <span>{label}</span>
        <ArrowUpRight className="h-3 w-3 opacity-60 transition group-hover/cta:translate-x-0.5 group-hover/cta:opacity-100" />
      </Link>
      <p className="line-clamp-1 text-[11px] leading-snug text-slate-500 dark:text-slate-500">
        {helper}
      </p>
    </div>
  );
}
