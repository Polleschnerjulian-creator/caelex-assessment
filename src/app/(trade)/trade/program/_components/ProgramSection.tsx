import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type ProgramSectionItem =
  | { label: string; value: string | null }
  | { label: string; value: boolean }
  | { label: string; value: Date | null };

interface ProgramSectionProps {
  icon: LucideIcon;
  title: string;
  items: ProgramSectionItem[];
  /**
   * Optional right-side header adornment — Sprint E3 wires the edit
   * chip into this slot when the viewer has MANAGER+ role.
   */
  headerAction?: ReactNode;
}

/**
 * Tile-card rendering one logical group of compliance-program fields.
 * Each row is a label + value pair; empty values render as a muted
 * em-dash. Booleans render Yes/No. Dates use European ISO format.
 *
 * Server Component — no client state. Editing happens via the optional
 * `headerAction` slot (which the page can populate with `SectionEditChip`).
 */
export function ProgramSection({
  icon: Icon,
  title,
  items,
  headerAction,
}: ProgramSectionProps) {
  const allEmpty = items.every((it) => formatValue(it.value) === "—");

  return (
    <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong">
            <Icon size={14} />
          </div>
          <h2 className="text-[15px] font-semibold text-trade-text-primary">
            {title}
          </h2>
        </div>
        {headerAction}
      </header>

      {allEmpty ? (
        <p className="text-[13px] italic text-trade-text-muted">
          No data yet — use the Edit button to populate this section.
        </p>
      ) : (
        <dl className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
          {items.map((it) => (
            <div
              key={it.label}
              className="flex items-baseline justify-between gap-4 border-b border-trade-border-subtle pb-2 last:border-b-0"
            >
              <dt className="text-[12px] font-medium uppercase tracking-wide text-trade-text-muted">
                {it.label}
              </dt>
              <dd className="text-right text-[13px] font-medium text-trade-text-primary">
                {formatValue(it.value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function formatValue(value: string | boolean | Date | null): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value === "") return "—";
  return value;
}
