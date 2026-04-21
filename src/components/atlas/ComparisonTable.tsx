"use client";

import { useMemo } from "react";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import type {
  SpaceLawCountryCode,
  JurisdictionLaw,
} from "@/lib/space-law-types";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getJurisdictionNames } from "@/app/(atlas)/atlas/i18n-labels";
import ForecastBadge from "./ForecastBadge";
import {
  getEffectiveEventsAt,
  type ForecastEvent,
} from "@/lib/atlas/forecast-engine";

// ─── Types ───

interface ComparisonTableProps {
  countries: SpaceLawCountryCode[];
  dimension: string;
  /**
   * Target date for the time-travel forecast view. When > today,
   * cells whose concept is affected by a forthcoming regulatory
   * change render a ForecastBadge. Defaults to today (no badges).
   */
  targetDate?: Date;
}

interface RowDef {
  label: string;
  /** Stable concept identifier used to cross-reference ForecastEvent.affectedConcepts. */
  conceptKey?: string;
  accessor: (law: JurisdictionLaw) => string;
  highlightDifferences?: boolean;
  monospace?: boolean;
}

/**
 * Given a jurisdiction code + concept key + target date, find the
 * most-relevant upcoming ForecastEvent. Returns null when nothing
 * qualifies (concept not affected, or target is today).
 */
function findForecastForConcept(
  events: ForecastEvent[],
  jurisdiction: string,
  conceptKey: string | undefined,
): ForecastEvent | null {
  if (!conceptKey) return null;
  for (const e of events) {
    if (!e.affectedConcepts.includes(conceptKey)) continue;
    if (
      e.jurisdictions.includes(jurisdiction) ||
      e.jurisdictions.includes("INT") ||
      (e.jurisdictions.includes("EU") && EU_MEMBER_CODES.has(jurisdiction))
    ) {
      return e;
    }
  }
  return null;
}

const EU_MEMBER_CODES = new Set([
  "FR",
  "DE",
  "IT",
  "LU",
  "NL",
  "BE",
  "ES",
  "AT",
  "PL",
  "DK",
  "SE",
  "FI",
  "PT",
  "GR",
  "CZ",
  "IE",
  "EE",
  "RO",
  "HU",
  "SI",
  "LV",
  "LT",
  "SK",
  "HR",
]);

// ─── Helpers ───

function boolLabel(
  val: boolean | undefined,
  t: (key: string) => string,
): string {
  if (val === undefined) return "N/A";
  return val ? t("atlas.yes") : t("atlas.no");
}

function safeStr(val: string | undefined | null, fallback = "N/A"): string {
  return val?.trim() || fallback;
}

function arrJoin(val: string[] | undefined, fallback = "N/A"): string {
  if (!val || val.length === 0) return fallback;
  return val.join("; ");
}

// ─── Dimension Row Definition Factories ───

function getAuthRows(t: (key: string) => string): RowDef[] {
  return [
    {
      label: t("atlas.licensing_authority"),
      accessor: (l) => l.licensingAuthority.name,
      highlightDifferences: false,
    },
    {
      label: t("atlas.legislation"),
      accessor: (l) =>
        `${l.legislation.name} (${l.legislation.yearEnacted || "N/A"})`,
      highlightDifferences: false,
    },
    {
      label: t("atlas.comp_status"),
      accessor: (l) => l.legislation.status.toUpperCase(),
      highlightDifferences: true,
    },
    {
      label: t("atlas.processing_time"),
      accessor: (l) =>
        `${l.timeline.typicalProcessingWeeks.min}–${l.timeline.typicalProcessingWeeks.max} ${t("atlas.weeks")}`,
      monospace: true,
      highlightDifferences: true,
    },
    {
      label: t("atlas.comp_application_fee"),
      accessor: (l) => safeStr(l.timeline.applicationFee),
      monospace: true,
      highlightDifferences: true,
    },
    {
      label: t("atlas.mandatory_insurance"),
      accessor: (l) =>
        l.insuranceLiability.mandatoryInsurance
          ? `${t("atlas.yes")} — ${safeStr(l.insuranceLiability.minimumCoverage, "TBD")}`
          : t("atlas.no"),
      highlightDifferences: true,
    },
    {
      label: t("atlas.comp_gov_indemnification"),
      accessor: (l) =>
        boolLabel(l.insuranceLiability.governmentIndemnification, t),
      highlightDifferences: true,
    },
    {
      label: t("atlas.comp_licensing_requirements"),
      accessor: (l) =>
        `${l.licensingRequirements.length} ${t("atlas.comp_requirements")}`,
      monospace: true,
      highlightDifferences: true,
    },
  ];
}

function getLiabilityRows(t: (key: string) => string): RowDef[] {
  return [
    {
      label: t("atlas.liability_regime"),
      accessor: (l) => l.insuranceLiability.liabilityRegime.toUpperCase(),
      highlightDifferences: true,
    },
    {
      label: t("atlas.comp_liability_cap"),
      accessor: (l) => safeStr(l.insuranceLiability.liabilityCap),
      monospace: true,
      highlightDifferences: true,
    },
    {
      label: t("atlas.mandatory_insurance"),
      accessor: (l) => boolLabel(l.insuranceLiability.mandatoryInsurance, t),
      highlightDifferences: true,
    },
    {
      label: t("atlas.comp_min_coverage"),
      accessor: (l) => safeStr(l.insuranceLiability.minimumCoverage),
      monospace: true,
      highlightDifferences: true,
    },
    {
      label: t("atlas.comp_third_party_required"),
      accessor: (l) => boolLabel(l.insuranceLiability.thirdPartyRequired, t),
      highlightDifferences: true,
    },
    {
      label: t("atlas.comp_gov_indemnification"),
      accessor: (l) =>
        boolLabel(l.insuranceLiability.governmentIndemnification, t),
      highlightDifferences: true,
    },
    {
      label: t("atlas.comp_indemnification_cap"),
      accessor: (l) => safeStr(l.insuranceLiability.indemnificationCap),
      highlightDifferences: false,
    },
  ];
}

function getDebrisRows(t: (key: string) => string): RowDef[] {
  return [
    {
      label: t("atlas.comp_deorbit_requirement"),
      accessor: (l) => boolLabel(l.debrisMitigation.deorbitRequirement, t),
      highlightDifferences: true,
    },
    {
      label: t("atlas.comp_deorbit_timeline"),
      accessor: (l) => safeStr(l.debrisMitigation.deorbitTimeline),
      highlightDifferences: true,
    },
    {
      label: t("atlas.comp_passivation"),
      accessor: (l) => boolLabel(l.debrisMitigation.passivationRequired, t),
      highlightDifferences: true,
    },
    {
      label: t("atlas.comp_debris_plan"),
      accessor: (l) => boolLabel(l.debrisMitigation.debrisMitigationPlan, t),
      highlightDifferences: true,
    },
    {
      label: t("atlas.comp_collision_avoidance"),
      accessor: (l) => boolLabel(l.debrisMitigation.collisionAvoidance, t),
      highlightDifferences: true,
    },
    {
      label: t("atlas.comp_standards"),
      accessor: (l) => arrJoin(l.debrisMitigation.standards),
      highlightDifferences: false,
    },
  ];
}

function getTimelineRows(t: (key: string) => string): RowDef[] {
  return [
    {
      label: t("atlas.processing_time"),
      accessor: (l) =>
        `${l.timeline.typicalProcessingWeeks.min}–${l.timeline.typicalProcessingWeeks.max} ${t("atlas.weeks")}`,
      monospace: true,
      highlightDifferences: true,
    },
    {
      label: t("atlas.comp_application_fee"),
      accessor: (l) => safeStr(l.timeline.applicationFee),
      monospace: true,
      highlightDifferences: true,
    },
    {
      label: t("atlas.comp_annual_fee"),
      accessor: (l) => safeStr(l.timeline.annualFee),
      monospace: true,
      highlightDifferences: true,
    },
    {
      label: t("atlas.comp_other_costs"),
      accessor: (l) =>
        arrJoin(l.timeline.otherCosts, t("atlas.comp_none_specified")),
      highlightDifferences: false,
    },
  ];
}

function getEuRows(t: (key: string) => string): RowDef[] {
  return [
    {
      label: t("atlas.comp_relationship"),
      accessor: (l) => l.euSpaceActCrossRef.relationship.toUpperCase(),
      highlightDifferences: true,
    },
    {
      label: t("atlas.comp_description"),
      accessor: (l) => l.euSpaceActCrossRef.description,
      highlightDifferences: false,
    },
    {
      label: t("atlas.key_articles"),
      accessor: (l) => arrJoin(l.euSpaceActCrossRef.keyArticles),
      highlightDifferences: false,
    },
    {
      label: t("atlas.comp_transition_notes"),
      accessor: (l) => safeStr(l.euSpaceActCrossRef.transitionNotes),
      highlightDifferences: false,
    },
  ];
}

function getRegistrationRows(t: (key: string) => string): RowDef[] {
  return [
    {
      label: t("atlas.national_registry"),
      accessor: (l) => boolLabel(l.registration.nationalRegistryExists, t),
      highlightDifferences: true,
    },
    {
      label: t("atlas.comp_registry_name"),
      accessor: (l) => safeStr(l.registration.registryName),
      highlightDifferences: false,
    },
    {
      label: t("atlas.comp_un_registration"),
      accessor: (l) => boolLabel(l.registration.unRegistrationRequired, t),
      highlightDifferences: true,
    },
  ];
}

// ─── Cell rendering helpers ───

type CellRender = {
  className: string;
  badge?: boolean;
  badgeClassName?: string;
};

// getCellRender uses the original English key concepts for matching logic,
// but since labels are now translated, we match on translation keys stored
// alongside the label. Instead, we use a stable lookup based on the
// untranslated concept. We pass the original row index/concept identifier.
// However, since the render function receives the displayed label, and the
// label text changes by language, we need a language-independent approach.
// Solution: pass a "conceptKey" alongside label for render matching.

interface RowDefInternal extends RowDef {
  /** Stable key used for cell rendering logic (language-independent) */
  conceptKey?: string;
}

function getCellRender(conceptKey: string, value: string): CellRender {
  const upper = value.toUpperCase();

  // Liability regime -- only UNLIMITED is worth calling out
  if (conceptKey === "liability_regime") {
    if (upper === "UNLIMITED") return { className: "text-red-600 font-medium" };
    return { className: "text-gray-900" };
  }

  // Liability cap -- highlight unlimited
  if (conceptKey === "liability_cap") {
    if (upper === "UNLIMITED" || upper.includes("UNLIMITED"))
      return { className: "text-red-600 font-medium" };
    return { className: "text-gray-900" };
  }

  // Status -- badge style
  if (conceptKey === "status") {
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

  // Relationship -- subtle differentiation, no heavy color
  if (conceptKey === "relationship") {
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

  // Boolean Yes/No -- check both English and German values
  const yesValues = ["YES", "JA"];
  const noValues = ["NO", "NEIN"];
  if (yesValues.includes(upper)) return { className: "text-gray-900" };
  if (noValues.includes(upper)) return { className: "text-gray-400" };
  if (value === "N/A") return { className: "text-gray-300" };

  // Yes/Ja with detail (e.g. "Yes — €60M" / "Ja — €60M")
  if (
    value.startsWith("Yes —") ||
    value.startsWith("Yes —") ||
    value.startsWith("Ja —") ||
    value.startsWith("Ja —")
  )
    return { className: "text-gray-900" };

  return { className: "text-gray-900" };
}

// ─── Component ───

export default function ComparisonTable({
  countries,
  dimension,
  targetDate,
}: ComparisonTableProps) {
  const { t } = useLanguage();
  const jurisdictionNames = useMemo(() => getJurisdictionNames(t), [t]);

  // Resolve forecast events once per targetDate change. Empty when
  // targetDate is today (default) — the comparator remains identical
  // to the pre-forecast experience for users who don't touch the
  // slider.
  const forecastEvents = useMemo<ForecastEvent[]>(() => {
    if (!targetDate) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    if (target.getTime() <= today.getTime()) return [];
    return getEffectiveEventsAt(target);
  }, [targetDate]);

  // Build translated row definitions
  const authRows = useMemo(
    () =>
      addConceptKeys(getAuthRows(t), [
        "licensing_authority",
        "legislation",
        "status",
        "processing_time",
        "application_fee",
        "mandatory_insurance",
        "gov_indemnification",
        "licensing_requirements",
      ]),
    [t],
  );

  const liabilityRows = useMemo(
    () =>
      addConceptKeys(getLiabilityRows(t), [
        "liability_regime",
        "liability_cap",
        "mandatory_insurance",
        "min_coverage",
        "third_party_required",
        "gov_indemnification",
        "indemnification_cap",
      ]),
    [t],
  );

  const debrisRows = useMemo(
    () =>
      addConceptKeys(getDebrisRows(t), [
        "deorbit_requirement",
        "deorbit_timeline",
        "passivation",
        "debris_plan",
        "collision_avoidance",
        "standards",
      ]),
    [t],
  );

  const timelineRows = useMemo(
    () =>
      addConceptKeys(getTimelineRows(t), [
        "processing_time",
        "application_fee",
        "annual_fee",
        "other_costs",
      ]),
    [t],
  );

  const euRows = useMemo(
    () =>
      addConceptKeys(getEuRows(t), [
        "relationship",
        "description",
        "key_articles",
        "transition_notes",
      ]),
    [t],
  );

  const registrationRows = useMemo(
    () =>
      addConceptKeys(getRegistrationRows(t), [
        "national_registry",
        "registry_name",
        "un_registration",
      ]),
    [t],
  );

  const dimensionMap: Record<string, RowDefInternal[]> = useMemo(
    () => ({
      all: [
        ...authRows,
        ...liabilityRows,
        ...debrisRows,
        ...timelineRows,
        ...registrationRows,
        ...euRows,
      ],
      authorization: authRows,
      liability: liabilityRows,
      debris: debrisRows,
      registration: registrationRows,
      timeline: timelineRows,
      eu_readiness: euRows,
    }),
    [
      authRows,
      liabilityRows,
      debrisRows,
      timelineRows,
      euRows,
      registrationRows,
    ],
  );

  const dimensionSectionMap = useMemo(
    () => ({
      all: [
        { label: t("atlas.authorization_licensing"), rows: authRows },
        { label: t("atlas.liability_insurance"), rows: liabilityRows },
        { label: t("atlas.debris_mitigation"), rows: debrisRows },
        { label: t("atlas.timeline_costs"), rows: timelineRows },
        { label: t("atlas.registration"), rows: registrationRows },
        { label: t("atlas.eu_space_act_readiness"), rows: euRows },
      ],
    }),
    [
      t,
      authRows,
      liabilityRows,
      debrisRows,
      timelineRows,
      euRows,
      registrationRows,
    ],
  );

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
            {t("atlas.comp_select_country")}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            {t("atlas.comp_select_hint")}
          </p>
        </div>
      </div>
    );
  }

  const sections =
    dimension === "all"
      ? dimensionSectionMap.all
      : [
          {
            label: dimension,
            rows: dimensionMap[dimension] || [],
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
                {t("atlas.provision")}
              </span>
            </th>
            {jurisdictions.map(({ code, data }) => (
              <th
                key={code}
                className="text-left py-3 px-4 bg-gray-50 border-b border-gray-200 min-w-[180px]"
              >
                <div>
                  <span className="text-[12px] font-medium text-gray-900 block">
                    {jurisdictionNames[code] || data.countryName}
                  </span>
                  <span className="text-[10px]  text-gray-400">{code}</span>
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
              rows={section.rows as RowDefInternal[]}
              jurisdictions={jurisdictions}
              showSectionHeader={dimension === "all"}
              forecastEvents={forecastEvents}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Utilities ───

function addConceptKeys(rows: RowDef[], keys: string[]): RowDefInternal[] {
  return rows.map((row, i) => ({
    ...row,
    conceptKey: keys[i] || "",
  }));
}

// ─── Section Block ───

function SectionBlock({
  label,
  rows,
  jurisdictions,
  showSectionHeader,
  forecastEvents,
}: {
  label: string;
  rows: RowDefInternal[];
  jurisdictions: { code: SpaceLawCountryCode; data: JurisdictionLaw }[];
  showSectionHeader: boolean;
  forecastEvents: ForecastEvent[];
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
              const render = getCellRender(row.conceptKey || "", value);
              const forecast = findForecastForConcept(
                forecastEvents,
                code,
                row.conceptKey,
              );

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
                        ${row.monospace ? " text-[12px]" : ""}
                        ${render.className}
                      `}
                    >
                      {value}
                    </span>
                  )}
                  {forecast && <ForecastBadge event={forecast} />}
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}
