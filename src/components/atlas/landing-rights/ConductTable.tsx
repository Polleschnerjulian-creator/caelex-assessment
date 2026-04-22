import { ALL_CONDUCT_CONDITIONS } from "@/data/landing-rights";

export function ConductTable() {
  return (
    <div className="overflow-x-auto rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)]">
      <table className="min-w-full text-[13px]">
        <thead className="bg-[var(--atlas-bg-surface-muted)]">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-[var(--atlas-text-secondary)]">
              Jurisdiction
            </th>
            <th className="px-4 py-3 text-left font-semibold text-[var(--atlas-text-secondary)]">
              Type
            </th>
            <th className="px-4 py-3 text-left font-semibold text-[var(--atlas-text-secondary)]">
              Title
            </th>
            <th className="px-4 py-3 text-left font-semibold text-[var(--atlas-text-secondary)]">
              Requirement
            </th>
            <th className="px-4 py-3 text-left font-semibold text-[var(--atlas-text-secondary)]">
              Applies to
            </th>
          </tr>
        </thead>
        <tbody>
          {ALL_CONDUCT_CONDITIONS.map((c) => (
            <tr
              key={c.id}
              className="border-t border-[var(--atlas-border-subtle)] align-top hover:bg-[var(--atlas-bg-surface-muted)]"
            >
              <td className="px-4 py-3 font-semibold text-[var(--atlas-text-primary)]">
                {c.jurisdiction}
              </td>
              <td className="px-4 py-3 text-[11px] uppercase tracking-wider text-[var(--atlas-text-secondary)]">
                {c.type.replace("_", " ")}
              </td>
              <td className="px-4 py-3 font-medium text-[var(--atlas-text-primary)]">
                {c.title}
              </td>
              <td className="px-4 py-3 text-[var(--atlas-text-secondary)] leading-relaxed max-w-md">
                {c.requirement}
              </td>
              <td className="px-4 py-3 text-[11px] uppercase tracking-wider text-[var(--atlas-text-muted)]">
                {c.applies_to.replace("_", " ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
