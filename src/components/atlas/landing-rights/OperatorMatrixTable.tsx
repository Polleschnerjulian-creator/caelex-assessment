import {
  OPERATOR_MATRIX,
  ALL_LANDING_RIGHTS_PROFILES,
} from "@/data/landing-rights";
import { LandingRightsStatusBadge } from "./LandingRightsStatusBadge";

export function OperatorMatrixTable() {
  const jurisdictions = ALL_LANDING_RIGHTS_PROFILES.map((p) => p.jurisdiction);

  return (
    <div className="overflow-x-auto rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)]">
      <table className="min-w-full text-[12px]">
        <thead className="bg-[var(--atlas-bg-surface-muted)]">
          <tr>
            <th className="sticky left-0 bg-[var(--atlas-bg-surface-muted)] px-4 py-3 text-left font-semibold text-[var(--atlas-text-secondary)]">
              Operator
            </th>
            {jurisdictions.map((j) => (
              <th
                key={j}
                className="px-3 py-3 text-center font-semibold text-[var(--atlas-text-secondary)]"
              >
                {j}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {OPERATOR_MATRIX.map((row) => (
            <tr
              key={row.operator}
              className="border-t border-[var(--atlas-border-subtle)]"
            >
              <td className="sticky left-0 bg-[var(--atlas-bg-surface)] px-4 py-3 font-medium text-[var(--atlas-text-primary)]">
                {row.operator}
              </td>
              {jurisdictions.map((j) => {
                const s = row.statuses[j];
                return (
                  <td key={j} className="px-3 py-3 text-center">
                    {s ? (
                      <span
                        title={`${s.status}${s.since ? ` since ${s.since}` : ""}${s.note ? ` — ${s.note}` : ""}`}
                      >
                        <LandingRightsStatusBadge status={s.status} />
                      </span>
                    ) : (
                      <span className="text-[var(--atlas-text-faint)]">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
