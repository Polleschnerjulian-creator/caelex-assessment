"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import type {
  TradeProgramRequirementStatus,
  TradeRequirementStatus,
} from "@prisma/client";
import { updateRequirementStatus } from "@/lib/trade/program-actions";

/**
 * Inline-edit popover for a single requirement status row (Sprint E3d).
 *
 * Visual contract:
 *  - Replaces the static `StatusBadge` when canEdit is true
 *  - Click the chip → opens a small popover with:
 *      • Status select (5 options)
 *      • Notes textarea (db.Text — multi-line)
 *      • Responsible party text input
 *      • Save / Cancel buttons
 *  - Save calls `updateRequirementStatus` server action; on success the
 *    popover closes and `revalidatePath('/trade/program')` re-renders
 *    the row with the new state.
 *
 * The popover is positioned relative to the chip via `absolute right-0
 * top-full`; clicking outside or pressing ESC closes it.
 */
interface RequirementStatusEditPopoverProps {
  row: TradeProgramRequirementStatus;
}

const STATUS_OPTIONS: { value: TradeRequirementStatus; label: string }[] = [
  { value: "COMPLIANT", label: "Compliant" },
  { value: "PARTIAL", label: "Partial" },
  { value: "NON_COMPLIANT", label: "Non-compliant" },
  { value: "NOT_ASSESSED", label: "Not assessed" },
  { value: "NOT_APPLICABLE", label: "Not applicable" },
];

export function RequirementStatusEditPopover({
  row,
}: RequirementStatusEditPopoverProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<TradeRequirementStatus>(row.status);
  const [notes, setNotes] = useState(row.notes ?? "");
  const [responsibleParty, setResponsibleParty] = useState(
    row.responsibleParty ?? "",
  );
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside-click + ESC
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await updateRequirementStatus({
        requirementId: row.requirementId,
        status,
        notes,
        responsibleParty,
      });
      if (result.ok) {
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${toneFor(status)}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {labelFor(status)}
        <ChevronDown size={11} />
      </button>

      {open && (
        <form
          onSubmit={handleSave}
          className="absolute right-0 top-[calc(100%+6px)] z-20 w-[340px] rounded-md border border-trade-border bg-trade-bg-panel p-4 shadow-lg"
        >
          <p className="mb-3 font-mono text-[11px] text-trade-text-muted">
            {row.requirementId}
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wide text-trade-text-muted">
                Status
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as TradeRequirementStatus)
                }
                className="mt-1 w-full rounded-md border border-trade-border bg-trade-bg-page px-2 py-1.5 text-[12.5px] text-trade-text-primary focus:border-trade-accent focus:outline-none focus:ring-1 focus:ring-trade-accent"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wide text-trade-text-muted">
                Responsible party
              </label>
              <input
                type="text"
                value={responsibleParty}
                onChange={(e) => setResponsibleParty(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="mt-1 w-full rounded-md border border-trade-border bg-trade-bg-page px-2 py-1.5 text-[12.5px] text-trade-text-primary placeholder:text-trade-text-muted focus:border-trade-accent focus:outline-none focus:ring-1 focus:ring-trade-accent"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wide text-trade-text-muted">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Compliance notes, evidence references, …"
                className="mt-1 w-full rounded-md border border-trade-border bg-trade-bg-page px-2 py-1.5 text-[12.5px] text-trade-text-primary placeholder:text-trade-text-muted focus:border-trade-accent focus:outline-none focus:ring-1 focus:ring-trade-accent"
              />
            </div>
          </div>

          {error && (
            <p className="trade-chip-danger mt-3 rounded px-2 py-1 text-[11.5px]">
              {error}
            </p>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="rounded-md px-3 py-1 text-[12px] font-medium text-trade-text-secondary hover:bg-trade-hover hover:text-trade-text-primary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-trade-accent px-3 py-1 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-trade-accent-strong disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function labelFor(status: TradeRequirementStatus): string {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function toneFor(status: TradeRequirementStatus): string {
  switch (status) {
    case "COMPLIANT":
      return "trade-chip-success";
    case "PARTIAL":
      return "trade-chip-warn";
    case "NON_COMPLIANT":
      return "trade-chip-danger";
    case "NOT_ASSESSED":
      return "trade-chip-neutral";
    case "NOT_APPLICABLE":
      return "trade-chip-neutral";
  }
}
