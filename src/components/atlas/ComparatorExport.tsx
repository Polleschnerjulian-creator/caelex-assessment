"use client";

import { useMemo } from "react";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import type {
  SpaceLawCountryCode,
  JurisdictionLaw,
} from "@/lib/space-law-types";
import { useLanguage } from "@/components/providers/LanguageProvider";

// ─── Types ───

interface ComparatorExportProps {
  countries: SpaceLawCountryCode[];
  dimension: string;
}

interface RowDef {
  label: string;
  accessor: (law: JurisdictionLaw) => string;
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

// ─── Dimension Row Definitions (same as ComparisonTable) ───

const AUTH_ROWS: RowDef[] = [
  { label: "Licensing Authority", accessor: (l) => l.licensingAuthority.name },
  {
    label: "Legislation",
    accessor: (l) =>
      `${l.legislation.name} (${l.legislation.yearEnacted || "N/A"})`,
  },
  { label: "Status", accessor: (l) => l.legislation.status.toUpperCase() },
  {
    label: "Processing Time",
    accessor: (l) =>
      `${l.timeline.typicalProcessingWeeks.min}\u2013${l.timeline.typicalProcessingWeeks.max} weeks`,
  },
  {
    label: "Application Fee",
    accessor: (l) => safeStr(l.timeline.applicationFee),
  },
  {
    label: "Mandatory Insurance",
    accessor: (l) =>
      l.insuranceLiability.mandatoryInsurance
        ? `Yes \u2014 ${safeStr(l.insuranceLiability.minimumCoverage, "TBD")}`
        : "No",
  },
  {
    label: "Gov. Indemnification",
    accessor: (l) => boolLabel(l.insuranceLiability.governmentIndemnification),
  },
  {
    label: "Licensing Requirements",
    accessor: (l) => `${l.licensingRequirements.length} requirements`,
  },
];

const LIABILITY_ROWS: RowDef[] = [
  {
    label: "Liability Regime",
    accessor: (l) => l.insuranceLiability.liabilityRegime.toUpperCase(),
  },
  {
    label: "Liability Cap",
    accessor: (l) => safeStr(l.insuranceLiability.liabilityCap),
  },
  {
    label: "Mandatory Insurance",
    accessor: (l) => boolLabel(l.insuranceLiability.mandatoryInsurance),
  },
  {
    label: "Min. Coverage",
    accessor: (l) => safeStr(l.insuranceLiability.minimumCoverage),
  },
  {
    label: "Third-Party Required",
    accessor: (l) => boolLabel(l.insuranceLiability.thirdPartyRequired),
  },
  {
    label: "Gov. Indemnification",
    accessor: (l) => boolLabel(l.insuranceLiability.governmentIndemnification),
  },
  {
    label: "Indemnification Cap",
    accessor: (l) => safeStr(l.insuranceLiability.indemnificationCap),
  },
];

const DEBRIS_ROWS: RowDef[] = [
  {
    label: "Deorbit Requirement",
    accessor: (l) => boolLabel(l.debrisMitigation.deorbitRequirement),
  },
  {
    label: "Deorbit Timeline",
    accessor: (l) => safeStr(l.debrisMitigation.deorbitTimeline),
  },
  {
    label: "Passivation Required",
    accessor: (l) => boolLabel(l.debrisMitigation.passivationRequired),
  },
  {
    label: "Debris Mitigation Plan",
    accessor: (l) => boolLabel(l.debrisMitigation.debrisMitigationPlan),
  },
  {
    label: "Collision Avoidance",
    accessor: (l) => boolLabel(l.debrisMitigation.collisionAvoidance),
  },
  {
    label: "Standards",
    accessor: (l) => arrJoin(l.debrisMitigation.standards),
  },
];

const TIMELINE_ROWS: RowDef[] = [
  {
    label: "Processing Time",
    accessor: (l) =>
      `${l.timeline.typicalProcessingWeeks.min}\u2013${l.timeline.typicalProcessingWeeks.max} weeks`,
  },
  {
    label: "Application Fee",
    accessor: (l) => safeStr(l.timeline.applicationFee),
  },
  { label: "Annual Fee", accessor: (l) => safeStr(l.timeline.annualFee) },
  {
    label: "Other Costs",
    accessor: (l) => arrJoin(l.timeline.otherCosts, "None specified"),
  },
];

const EU_ROWS: RowDef[] = [
  {
    label: "Relationship",
    accessor: (l) => l.euSpaceActCrossRef.relationship.toUpperCase(),
  },
  {
    label: "Description",
    accessor: (l) => l.euSpaceActCrossRef.description,
  },
  {
    label: "Key Articles",
    accessor: (l) => arrJoin(l.euSpaceActCrossRef.keyArticles),
  },
  {
    label: "Transition Notes",
    accessor: (l) => safeStr(l.euSpaceActCrossRef.transitionNotes),
  },
];

const REGISTRATION_ROWS: RowDef[] = [
  {
    label: "National Registry",
    accessor: (l) => boolLabel(l.registration.nationalRegistryExists),
  },
  {
    label: "Registry Name",
    accessor: (l) => safeStr(l.registration.registryName),
  },
  {
    label: "UN Registration Required",
    accessor: (l) => boolLabel(l.registration.unRegistrationRequired),
  },
];

const ALL_SECTIONS = [
  { key: "authorization", label: "Authorization & Licensing", rows: AUTH_ROWS },
  { key: "liability", label: "Liability & Insurance", rows: LIABILITY_ROWS },
  { key: "debris", label: "Debris Mitigation", rows: DEBRIS_ROWS },
  { key: "timeline", label: "Timeline & Costs", rows: TIMELINE_ROWS },
  { key: "registration", label: "Registration", rows: REGISTRATION_ROWS },
  { key: "eu_readiness", label: "EU Space Act Readiness", rows: EU_ROWS },
];

const DIMENSION_LABELS: Record<string, string> = {
  all: "All Dimensions",
  authorization: "Authorization & Licensing",
  liability: "Liability & Insurance",
  debris: "Debris Mitigation",
  registration: "Registration",
  timeline: "Timeline & Costs",
  eu_readiness: "EU Space Act Readiness",
};

// ─── Component ───

export default function ComparatorExport({
  countries,
  dimension,
}: ComparatorExportProps) {
  const { t } = useLanguage();

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

  if (jurisdictions.length === 0) return null;

  const sections =
    dimension === "all"
      ? ALL_SECTIONS
      : ALL_SECTIONS.filter((s) => s.key === dimension);

  const countryLine = jurisdictions
    .map(({ code, data }) => `${data.countryName} (${code})`)
    .join(" \u00b7 ");

  const dimensionLabel = DIMENSION_LABELS[dimension] || "All Dimensions";

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="print-export-container" aria-hidden="true">
      {/* ─── Cover / Header ─── */}
      <div className="print-header">
        <div className="print-header-brand">
          <div className="print-header-logo">ATLAS</div>
          <div className="print-header-subtitle">Regulatory Intelligence</div>
        </div>
        <div className="print-header-divider" />
        <h1 className="print-header-title">{t("atlas.export_title")}</h1>
        <div className="print-header-meta">
          <div className="print-header-meta-row">
            <span className="print-header-meta-label">
              {t("atlas.export_date")}:
            </span>
            <span>{dateStr}</span>
          </div>
          <div className="print-header-meta-row">
            <span className="print-header-meta-label">
              {t("atlas.export_jurisdictions")}:
            </span>
            <span>{countryLine}</span>
          </div>
          <div className="print-header-meta-row">
            <span className="print-header-meta-label">
              {t("atlas.export_dimension")}:
            </span>
            <span>{dimensionLabel}</span>
          </div>
        </div>
        <div className="print-header-confidential">
          {t("atlas.export_confidential")}
        </div>
      </div>

      {/* ─── Sections ─── */}
      {sections.map((section, sIdx) => (
        <div
          key={section.key}
          className={sIdx > 0 ? "print-section-break" : ""}
        >
          <h2 className="print-section-title">{section.label}</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th className="print-table-provision">
                  {t("atlas.provision")}
                </th>
                {jurisdictions.map(({ code, data }) => (
                  <th key={code} className="print-table-country">
                    {data.countryName}
                    <span className="print-table-code"> ({code})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  <td className="print-table-label">{row.label}</td>
                  {jurisdictions.map(({ code, data }) => (
                    <td key={code} className="print-table-cell">
                      {row.accessor(data)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* ─── Footer / Disclaimer ─── */}
      <div className="print-footer-block">
        <div className="print-footer-divider" />
        <p className="print-footer-brand">
          ATLAS by Caelex — Regulatory Intelligence
        </p>
        <p className="print-footer-disclaimer">
          {t("atlas.export_disclaimer")}
        </p>
      </div>
    </div>
  );
}
