import { ClipboardCheck } from "lucide-react";
import type {
  TradeProgramRequirementStatus,
  TradeRequirementStatus,
} from "@prisma/client";
import { RequirementStatusEditPopover } from "./RequirementStatusEditPopover";

interface RequirementStatusListProps {
  statuses: TradeProgramRequirementStatus[];
  /**
   * When true, the status pill becomes an interactive popover (Sprint
   * E3d). When false, the row stays read-only.
   */
  canEdit?: boolean;
}

/**
 * Per-requirement status list for the compliance program. Editable
 * via inline popover when `canEdit` is true (MANAGER+ role).
 */
export function RequirementStatusList({
  statuses,
  canEdit = false,
}: RequirementStatusListProps) {
  return (
    <section
      id="requirements"
      className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5"
    >
      <header className="mb-4 flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong">
          <ClipboardCheck size={14} />
        </div>
        <h2 className="text-[15px] font-semibold text-trade-text-primary">
          Requirement Status
        </h2>
        <span className="ml-auto text-[11px] uppercase tracking-wider text-trade-text-muted">
          {statuses.length === 0
            ? "No requirements tracked yet"
            : `${statuses.length} requirements`}
        </span>
      </header>

      {statuses.length === 0 ? (
        <p className="text-[13px] italic text-trade-text-muted">
          Requirements will appear here after the Sprint T5 legacy-data
          migration ships. In the meantime, you can preview the catalog at
          /dashboard/modules/export-control.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-trade-border-subtle">
          {statuses.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-4 py-2.5"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[12px] text-trade-text-primary">
                  {s.requirementId}
                </span>
                {s.responsibleParty ? (
                  <span className="text-[11px] text-trade-text-muted">
                    Owner: {s.responsibleParty}
                  </span>
                ) : null}
              </div>
              {canEdit ? (
                <RequirementStatusEditPopover row={s} />
              ) : (
                <StatusBadge status={s.status} />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: TradeRequirementStatus }) {
  const config: Record<
    TradeRequirementStatus,
    { label: string; tone: string }
  > = {
    COMPLIANT: {
      label: "Compliant",
      tone: "trade-chip-success",
    },
    PARTIAL: {
      label: "Partial",
      tone: "trade-chip-warn",
    },
    NON_COMPLIANT: {
      label: "Non-compliant",
      tone: "trade-chip-danger",
    },
    NOT_ASSESSED: {
      label: "Not assessed",
      tone: "trade-chip-neutral",
    },
    NOT_APPLICABLE: {
      label: "Not applicable",
      tone: "trade-chip-neutral",
    },
  };
  const { label, tone } = config[status];
  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${tone}`}
    >
      {label}
    </span>
  );
}
