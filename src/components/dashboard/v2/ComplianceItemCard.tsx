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

export function ComplianceItemCard({
  item,
  snoozedUntil,
}: ComplianceItemCardProps) {
  const [open, setOpen] = React.useState(false);
  const tone = item.priority === "URGENT" ? "emerald" : "slate";
  const noteSnippet =
    item.notes?.slice(0, 140) || item.evidenceNotes?.slice(0, 140);

  const isSnoozed = Boolean(snoozedUntil);
  const detailHref = `/dashboard/items/${item.regulation}/${item.rowId}`;

  return (
    <Card tone={tone} className="group/card relative flex flex-col">
      <CardHeader className="pb-2">
        <div className="mb-1 flex items-start justify-between gap-2">
          <Badge variant={statusVariant(item.status)}>
            {STATUS_LABELS[item.status]}
          </Badge>
          <div className="flex items-center gap-1">
            <Link
              href={detailHref}
              aria-label="Open item detail"
              className="rounded-md p-1 text-slate-400 opacity-0 transition group-hover/card:opacity-100 hover:bg-slate-100 hover:text-slate-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              {item.regulation}
            </span>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Open item actions"
                  className="rounded-md p-1 text-slate-400 opacity-0 transition group-hover/card:opacity-100 hover:bg-slate-100 hover:text-slate-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <MoreHorizontal className="h-4 w-4" />
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
        <CardTitle className="leading-snug">
          <Link
            href={detailHref}
            className="text-slate-900 transition hover:text-emerald-700 dark:text-slate-50 dark:hover:text-emerald-300"
          >
            {item.requirementId}
          </Link>
        </CardTitle>
        <CardDescription className="text-xs">
          {REGULATION_LABELS[item.regulation]}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4 pt-1">
        {noteSnippet ? (
          <p className="line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            {noteSnippet}
          </p>
        ) : (
          <p className="text-xs italic text-slate-400 dark:text-slate-500">
            No notes yet.
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          {item.targetDate ? (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Due {new Date(item.targetDate).toLocaleDateString()}
            </span>
          ) : null}
          {isSnoozed ? (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Clock className="h-3 w-3" />
              Snoozed until {new Date(snoozedUntil!).toLocaleDateString()}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
