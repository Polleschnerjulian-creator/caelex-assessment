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

// ─── Highlight color logic ───

function getRelationshipColor(val: string): string {
  const upper = val.toUpperCase();
  if (upper === "SUPERSEDED") return "text-amber-400";
  if (upper === "COMPLEMENTARY") return "text-emerald-400";
  if (upper === "PARALLEL") return "text-sky-400";
  if (upper === "GAP") return "text-red-400";
  return "";
}

function getLiabilityColor(val: string): string {
  const upper = val.toUpperCase();
  if (upper === "UNLIMITED") return "text-red-400";
  if (upper === "CAPPED") return "text-emerald-400";
  if (upper === "TIERED") return "text-amber-400";
  if (upper === "NEGOTIABLE") return "text-sky-400";
  return "";
}

function getStatusColor(val: string): string {
  const upper = val.toUpperCase();
  if (upper === "ENACTED") return "text-emerald-400";
  if (upper === "DRAFT") return "text-amber-400";
  if (upper === "PENDING") return "text-amber-400";
  if (upper === "NONE") return "text-red-400";
  return "";
}

function getBoolColor(val: string): string {
  if (val === "Yes") return "text-emerald-400";
  if (val === "No") return "text-red-400/80";
  return "";
}

function getCellHighlightClass(
  label: string,
  value: string,
  allValues: string[],
): string {
  // Determine if this value is different from the majority
  const unique = new Set(allValues);
  const isMixed = unique.size > 1;

  // Specific value-based coloring
  if (label === "Liability Regime") return getLiabilityColor(value);
  if (label === "Relationship") return getRelationshipColor(value);
  if (label === "Status") return getStatusColor(value);

  // Boolean fields
  if (value === "Yes" || value === "No") {
    if (isMixed) return getBoolColor(value);
    return "";
  }

  // If mixed values, highlight outliers with a subtle background
  if (isMixed && allValues.length > 2) {
    const counts = new Map<string, number>();
    for (const v of allValues) {
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    const maxCount = Math.max(...counts.values());
    const thisCount = counts.get(value) || 0;
    if (thisCount < maxCount) {
      return "text-amber-300/90";
    }
  }

  return "";
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
          <p className="text-[13px] text-slate-400">
            Select at least one country to begin comparison.
          </p>
          <p className="text-[11px] text-slate-600 mt-1">
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
            <th className="text-left py-2 px-3 bg-[#0A0F1E] border-b border-white/[0.08] w-[200px] min-w-[180px]">
              <span className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
                Provision
              </span>
            </th>
            {jurisdictions.map(({ code, data }) => (
              <th
                key={code}
                className="text-left py-2 px-3 bg-[#0A0F1E] border-b border-white/[0.08] min-w-[160px]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[16px] leading-none">
                    {data.flagEmoji}
                  </span>
                  <div>
                    <span className="text-[11px] font-semibold text-white/90 block">
                      {data.countryName}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      {code}
                    </span>
                  </div>
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
            className="pt-4 pb-1.5 px-3 bg-[#0A0F1E]"
          >
            <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-500/70 uppercase">
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
            className="group hover:bg-white/[0.02] transition-colors duration-100"
          >
            <td className="py-1.5 px-3 border-b border-white/[0.04] align-top">
              <span className="text-[11px] font-medium text-slate-400 leading-tight">
                {row.label}
              </span>
            </td>
            {jurisdictions.map(({ code, data }, colIdx) => {
              const value = row.accessor(data);
              const highlightClass = row.highlightDifferences
                ? getCellHighlightClass(row.label, value, allValues)
                : "";

              return (
                <td
                  key={code}
                  className={`
                    py-1.5 px-3 border-b border-white/[0.04] align-top
                    ${colIdx > 0 ? "border-l border-white/[0.04]" : ""}
                  `}
                >
                  <span
                    className={`
                      text-[11px] leading-relaxed
                      ${row.monospace ? "font-mono" : ""}
                      ${highlightClass || "text-slate-300"}
                    `}
                  >
                    {value}
                  </span>
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}
