import {
  OPERATOR_MATRIX,
  ALL_LANDING_RIGHTS_PROFILES,
} from "@/data/landing-rights";
import { LandingRightsStatusBadge } from "./LandingRightsStatusBadge";

export function OperatorMatrixTable() {
  const jurisdictions = ALL_LANDING_RIGHTS_PROFILES.map((p) => p.jurisdiction);

  return (
    <div className="overflow-x-auto rounded-xl bg-white border border-gray-100">
      <table className="min-w-full text-[12px]">
        <thead className="bg-gray-50">
          <tr>
            <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700">
              Operator
            </th>
            {jurisdictions.map((j) => (
              <th
                key={j}
                className="px-3 py-3 text-center font-semibold text-gray-600"
              >
                {j}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {OPERATOR_MATRIX.map((row) => (
            <tr key={row.operator} className="border-t border-gray-100">
              <td className="sticky left-0 bg-white px-4 py-3 font-medium text-gray-900">
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
                      <span className="text-gray-300">—</span>
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
