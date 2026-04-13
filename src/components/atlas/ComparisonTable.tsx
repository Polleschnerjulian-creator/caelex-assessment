"use client";

import { useMemo } from "react";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import type {
  SpaceLawCountryCode,
  JurisdictionLaw,
} from "@/lib/space-law-types";

// ─── Types ───

interface ComparisonTableProps {
  countries: SpaceLawCountryCode[];
  dimension: string;
}

interface RowDef {
  label: string;
  accessor: (law: JurisdictionLaw) => string;
  highlightDifferences?: boolean;
  monospace?: boolean;
}

// ─── Helpers ───

function boolLabel(val: boolean | undefined): string {
  if (val === undefined) return "N/A";
  return val ? "Yes" : "No";
}

function safeStr(val: string | undefined | null, fallback = "N/A"): string {
  return val?.trim() || fallback;
}

function arrJoin(val: string[] | undefined, fallback = "N/A"): string {
  if (!val || val.length === 0) return fallback;
  return val.join("; ");
}

// ─── Dimension Row Definitions ───

const AUTH_ROWS: RowDef[] = [
  {
    label: "Licensing Authority",
    accessor: (l) => l.licensingAuthority.name,
    highlightDifferences: false,
  },
  {
    label: "Legislation",
    accessor: (l) =>
      `${l.legislation.name} (${l.legislation.yearEnacted || "N/A"})`,
    highlightDifferences: false,
  },
  {
    label: "Status",
    accessor: (l) => l.legislation.status.toUpperCase(),
    highlightDifferences: true,
  },
  {
    label: "Processing Time",
    accessor: (l) =>
      `${l.timeline.typicalProcessingWeeks.min}–${l.timeline.typicalProcessingWeeks.max} weeks`,
    monospace: true,
    highlightDifferences: true,
  },
  {
    label: "Application Fee",
    accessor: (l) => safeStr(l.timeline.applicationFee),
    monospace: true,
    highlightDifferences: true,
  },
  {
    label: "Mandatory Insurance",
    accessor: (l) =>
      l.insuranceLiability.mandatoryInsurance
        ? `Yes — ${safeStr(l.insuranceLiability.minimumCoverage, "TBD")}`
        : "No",
    highlightDifferences: true,
  },
  {
    label: "Gov. Indemnification",
    accessor: (l) => boolLabel(l.insuranceLiability.governmentIndemnification),
    highlightDifferences: true,
  },
  {
    label: "Licensing Requirements",
    accessor: (l) => `${l.licensingRequirements.length} requirements`,
    monospace: true,
    highlightDifferences: true,
  },
];

const LIABILITY_ROWS: RowDef[] = [
  {
    label: "Liability Regime",
    accessor: (l) => l.insuranceLiability.liabilityRegime.toUpperCase(),
    highlightDifferences: true,
  },
  {
    label: "Liability Cap",
    accessor: (l) => safeStr(l.insuranceLiability.liabilityCap),
    monospace: true,
    highlightDifferences: true,
  },
  {
    label: "Mandatory Insurance",
    accessor: (l) => boolLabel(l.insuranceLiability.mandatoryInsurance),
    highlightDifferences: true,
  },
  {
    label: "Min. Coverage",
    accessor: (l) => safeStr(l.insuranceLiability.minimumCoverage),
    monospace: true,
    highlightDifferences: true,
  },
  {
    label: "Third-Party Required",
    accessor: (l) => boolLabel(l.insuranceLiability.thirdPartyRequired),
    highlightDifferences: true,
  },
  {
    label: "Gov. Indemnification",
    accessor: (l) => boolLabel(l.insuranceLiability.governmentIndemnification),
    highlightDifferences: true,
  },
  {
    label: "Indemnification Cap",
    accessor: (l) => safeStr(l.insuranceLiability.indemnificationCap),
    highlightDifferences: false,
  },
];

const DEBRIS_ROWS: RowDef[] = [
  {
    label: "Deorbit Requirement",
    accessor: (l) => boolLabel(l.debrisMitigation.deorbitRequirement),
    highlightDifferences: true,
  },
  {
    label: "Deorbit Timeline",
    accessor: (l) => safeStr(l.debrisMitigation.deorbitTimeline),
    highlightDifferences: true,
  },
  {
    label: "Passivation Required",
    accessor: (l) => boolLabel(l.debrisMitigation.passivationRequired),
    highlightDifferences: true,
  },
  {
    label: "Debris Mitigation Plan",
    accessor: (l) => boolLabel(l.debrisMitigation.debrisMitigationPlan),
    highlightDifferences: true,
  },
  {
    label: "Collision Avoidance",
    accessor: (l) => boolLabel(l.debrisMitigation.collisionAvoidance),
    highlightDifferences: true,
  },
  {
    label: "Standards",
    accessor: (l) => arrJoin(l.debrisMitigation.standards),
    highlightDifferences: false,
  },
];

const TIMELINE_ROWS: RowDef[] = [
  {
    label: "Processing Time",
    accessor: (l) =>
      `${l.timeline.typicalProcessingWeeks.min}–${l.timeline.typicalProcessingWeeks.max} weeks`,
    monospace: true,
    highlightDifferences: true,
  },
  {
    label: "Application Fee",
    accessor: (l) => safeStr(l.timeline.applicationFee),
    monospace: true,
    highlightDifferences: true,
  },
  {
    label: "Annual Fee",
    accessor: (l) => safeStr(l.timeline.annualFee),
    monospace: true,
    highlightDifferences: true,
  },
  {
    label: "Other Costs",
    accessor: (l) => arrJoin(l.timeline.otherCosts, "None specified"),
    highlightDifferences: false,
  },
];

const EU_ROWS: RowDef[] = [
  {
    label: "Relationship",
    accessor: (l) => l.euSpaceActCrossRef.relationship.toUpperCase(),
    highlightDifferences: true,
  },
  {
    label: "Description",
    accessor: (l) => l.euSpaceActCrossRef.description,
    highlightDifferences: false,
  },
  {
    label: "Key Articles",
    accessor: (l) => arrJoin(l.euSpaceActCrossRef.keyArticles),
    highlightDifferences: false,
  },
  {
    label: "Transition Notes",
    accessor: (l) => safeStr(l.euSpaceActCrossRef.transitionNotes),
    highlightDifferences: false,
  },
];

const REGISTRATION_ROWS: RowDef[] = [
  {
    label: "National Registry",
    accessor: (l) => boolLabel(l.registration.nationalRegistryExists),
    highlightDifferences: true,
  },
  {
    label: "Registry Name",
    accessor: (l) => safeStr(l.registration.registryName),
    highlightDifferences: false,
  },
  {
    label: "UN Registration Required",
    accessor: (l) => boolLabel(l.registration.unRegistrationRequired),
    highlightDifferences: true,
  },
];

const DIMENSION_MAP: Record<string, RowDef[]> = {
  all: [
    ...AUTH_ROWS,
    ...LIABILITY_ROWS,
    ...DEBRIS_ROWS,
    ...TIMELINE_ROWS,
    ...REGISTRATION_ROWS,
    ...EU_ROWS,
  ],
  authorization: AUTH_ROWS,
  liability: LIABILITY_ROWS,
  debris: DEBRIS_ROWS,
  registration: REGISTRATION_ROWS,
  timeline: TIMELINE_ROWS,
  eu_readiness: EU_ROWS,
};

// ─── Cell rendering helpers ───

type CellRender = {
  className: string;
  badge?: boolean;
  badgeClassName?: string;
};

function getCellRender(label: string, value: string): CellRender {
  const upper = value.toUpperCase();

  // Liability regime — only UNLIMITED is worth calling out
  if (label === "Liability Regime") {
    if (upper === "UNLIMITED") return { className: "text-red-600 font-medium" };
    return { className: "text-gray-900" };
  }

  // Liability cap — highlight unlimited
  if (label === "Liability Cap") {
    if (upper === "UNLIMITED" || upper.includes("UNLIMITED"))
      return { className: "text-red-600 font-medium" };
    return { className: "text-gray-900" };
  }

  // Status — badge style
  if (label === "Status") {
    if (upper === "ENACTED")
      return {
        className: "",
        badge: true,
        badgeClassName:
          "text-[10px] font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded inline-block",
      };
    if (upper === "DRAFT" || upper === "PENDING")
      return {
        className: "",
        badge: true,
        badgeClassName:
          "text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded inline-block",
      };
    if (upper === "NONE") return { className: "text-gray-400" };
    return { className: "text-gray-900" };
  }

  // Relationship — subtle differentiation, no heavy color
  if (label === "Relationship") {
    if (upper === "GAP")
      return {
        className: "",
        badge: true,
        badgeClassName:
          "text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded inline-block",
      };
    return {
      className: "",
      badge: true,
      badgeClassName:
        "text-[10px] font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded inline-block",
    };
  }

  // Boolean Yes/No — black for Yes, gray for No
  if (value === "Yes") return { className: "text-gray-900" };
  if (value === "No") return { className: "text-gray-400" };
  if (value === "N/A") return { className: "text-gray-300" };

  // Yes with detail (e.g. "Yes — €60M")
  if (value.startsWith("Yes —") || value.startsWith("Yes —"))
    return { className: "text-gray-900" };

  return { className: "text-gray-900" };
}

// ─── Section header mapping ───

const DIMENSION_SECTION_MAP: Record<
  string,
  { label: string; rows: RowDef[] }[]
> = {
  all: [
    { label: "Authorization & Licensing", rows: AUTH_ROWS },
    { label: "Liability & Insurance", rows: LIABILITY_ROWS },
    { label: "Debris Mitigation", rows: DEBRIS_ROWS },
    { label: "Timeline & Costs", rows: TIMELINE_ROWS },
    { label: "Registration", rows: REGISTRATION_ROWS },
    { label: "EU Space Act Readiness", rows: EU_ROWS },
  ],
};

// ─── Component ───

export default function ComparisonTable({
  countries,
  dimension,
}: ComparisonTableProps) {
  const jurisdictions = useMemo(() => {
    return countries
      .map((code) => {
        const data = JURISDICTION_DATA.get(code);
        return data ? { code, data } : null;
      })
      .filter(Boolean) as {
      code: SpaceLawCountryCode;
      data: JurisdictionLaw;
    }[];
  }, [countries]);

  if (jurisdictions.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-[13px] text-gray-500">
            Select at least one country to begin comparison.
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Choose up to 5 jurisdictions from the selector above.
          </p>
        </div>
      </div>
    );
  }

  const sections =
    dimension === "all"
      ? DIMENSION_SECTION_MAP.all
      : [
          {
            label: dimension,
            rows: DIMENSION_MAP[dimension] || [],
          },
        ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[600px]">
        {/* Sticky header */}
        <thead className="sticky top-0 z-20">
          <tr>
            <th className="text-left py-3 px-4 bg-gray-50 border-b border-gray-200 w-[200px] min-w-[180px]">
              <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
                Provision
              </span>
            </th>
            {jurisdictions.map(({ code, data }) => (
              <th
                key={code}
                className="text-left py-3 px-4 bg-gray-50 border-b border-gray-200 min-w-[180px]"
              >
                <div>
                  <span className="text-[12px] font-medium text-gray-900 block">
                    {data.countryName}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">
                    {code}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {sections.map((section) => (
            <SectionBlock
              key={section.label}
              label={section.label}
              rows={section.rows}
              jurisdictions={jurisdictions}
              showSectionHeader={dimension === "all"}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Section Block ───

function SectionBlock({
  label,
  rows,
  jurisdictions,
  showSectionHeader,
}: {
  label: string;
  rows: RowDef[];
  jurisdictions: { code: SpaceLawCountryCode; data: JurisdictionLaw }[];
  showSectionHeader: boolean;
}) {
  return (
    <>
      {showSectionHeader && (
        <tr>
          <td
            colSpan={jurisdictions.length + 1}
            className="pt-5 pb-2 px-4 bg-white border-b border-gray-100"
          >
            <span className="text-[11px] font-semibold tracking-[0.1em] text-gray-900 uppercase">
              {label}
            </span>
          </td>
        </tr>
      )}
      {rows.map((row, i) => {
        const allValues = jurisdictions.map(({ data }) => row.accessor(data));

        return (
          <tr
            key={`${label}-${i}`}
            className={`group hover:bg-gray-50/80 transition-colors duration-100 ${
              i % 2 === 1 ? "bg-gray-50/50" : "bg-white"
            }`}
          >
            <td className="py-2.5 px-4 border-b border-gray-100 align-top">
              <span className="text-[12px] font-medium text-gray-500 leading-tight">
                {row.label}
              </span>
            </td>
            {jurisdictions.map(({ code, data }, colIdx) => {
              const value = row.accessor(data);
              const render = getCellRender(row.label, value);

              return (
                <td
                  key={code}
                  className={`
                    py-2.5 px-4 border-b border-gray-100 align-top
                    ${colIdx > 0 ? "border-l border-gray-100" : ""}
                  `}
                >
                  {render.badge ? (
                    <span className={render.badgeClassName}>{value}</span>
                  ) : (
                    <span
                      className={`
                        text-[13px] leading-relaxed
                        ${row.monospace ? "font-mono text-[12px]" : ""}
                        ${render.className}
                      `}
                    >
                      {value}
                    </span>
                  )}
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}
