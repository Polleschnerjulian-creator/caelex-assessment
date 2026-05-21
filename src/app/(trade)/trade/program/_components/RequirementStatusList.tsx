import { ClipboardCheck } from "lucide-react";
import type {
  TradeProgramRequirementStatus,
  TradeRequirementStatus,
} from "@prisma/client";

interface RequirementStatusListProps {
  statuses: TradeProgramRequirementStatus[];
}

/**
 * Read-only list of per-requirement statuses for the compliance program
 * (Sprint T4 skeleton). Renders the rows with a colour-coded status pill;
 * once T5 ships the legacy-data migration, this list will be populated
 * with real `ITAR-*` / `EAR-*` rows out of the box.
 */
export function RequirementStatusList({
  statuses,
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
              <StatusBadge status={s.status} />
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
      tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    },
    PARTIAL: {
      label: "Partial",
      tone: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    },
    NON_COMPLIANT: {
      label: "Non-compliant",
      tone: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    },
    NOT_ASSESSED: {
      label: "Not assessed",
      tone: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
    },
    NOT_APPLICABLE: {
      label: "Not applicable",
      tone: "bg-slate-100 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400",
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
