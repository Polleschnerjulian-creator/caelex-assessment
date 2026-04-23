"use client";

import { useMemo } from "react";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import type {
  SpaceLawCountryCode,
  JurisdictionLaw,
} from "@/lib/space-law-types";
import { useLanguage } from "@/components/providers/LanguageProvider";

/**
 * ComparatorExport — Atlas PDF briefing for the /atlas/comparator view.
 *
 * Design direction: Linear / Palantir — pure monochrome, generous
 * whitespace, strong typographic hierarchy, no color accents.
 *
 * Page architecture:
 *   Page 1      COVER              .print-cover
 *   Page 2      AT A GLANCE        .print-glance
 *   Pages 3+    DATA SECTIONS      .print-section (one per dimension)
 *   Last page   SOURCES + LEGAL    .print-appendix
 *
 * The component is hidden on screen via .print-export-container
 * (display: none) and is only surfaced inside @media print.
 * Layout primitives live in globals.css under the
 * "ATLAS BRIEFING — PRINT / PDF EXPORT" block.
 */

// ─── Types ───

interface ComparatorExportProps {
  countries: SpaceLawCountryCode[];
  dimension: string;
}

interface RowValue {
  kind: "pill-yes" | "pill-no" | "pill-na" | "text";
  text: string;
}

interface RowDef {
  label: string;
  accessor: (law: JurisdictionLaw) => RowValue;
  emphasis?: boolean;
}

interface SectionDef {
  key: string;
  num: string;
  label: string;
  lede: string;
  rows: RowDef[];
}

// ─── Helpers ───

function pillYesNo(val: boolean | undefined): RowValue {
  if (val === undefined) return { kind: "pill-na", text: "N/A" };
  return val
    ? { kind: "pill-yes", text: "Yes" }
    : { kind: "pill-no", text: "No" };
}

function txt(
  val: string | undefined | null,
  fallback = "Not specified",
): RowValue {
  const trimmed = val?.trim();
  if (!trimmed) return { kind: "pill-na", text: fallback };
  return { kind: "text", text: trimmed };
}

function joinArr(
  val: string[] | undefined,
  fallback = "None specified",
): RowValue {
  if (!val || val.length === 0) return { kind: "pill-na", text: fallback };
  return { kind: "text", text: val.join(" · ") };
}

// ─── Dimension Row Definitions ───

// NOTE: Processing Time + Application Fee rows removed — those fields
// in the underlying data are editorial estimates, not primary-source
// figures. Keeping them in a Atlas-branded briefing would undermine
// the "primary-source only" positioning.
const AUTH_ROWS: RowDef[] = [
  {
    label: "Licensing Authority",
    accessor: (l) => txt(l.licensingAuthority.name),
    emphasis: true,
  },
  {
    label: "Legislation",
    accessor: (l) =>
      txt(`${l.legislation.name} (${l.legislation.yearEnacted || "n/a"})`),
  },
  {
    label: "Status",
    accessor: (l) => txt(l.legislation.status.toUpperCase()),
  },
  {
    label: "Mandatory Insurance",
    accessor: (l) => pillYesNo(l.insuranceLiability.mandatoryInsurance),
  },
  {
    label: "Gov. Indemnification",
    accessor: (l) => pillYesNo(l.insuranceLiability.governmentIndemnification),
  },
];

const LIABILITY_ROWS: RowDef[] = [
  {
    label: "Liability Regime",
    accessor: (l) => txt(l.insuranceLiability.liabilityRegime.toUpperCase()),
    emphasis: true,
  },
  {
    label: "Liability Cap",
    accessor: (l) => txt(l.insuranceLiability.liabilityCap, "No cap"),
  },
  {
    label: "Mandatory Insurance",
    accessor: (l) => pillYesNo(l.insuranceLiability.mandatoryInsurance),
  },
  {
    label: "Minimum Coverage",
    accessor: (l) => txt(l.insuranceLiability.minimumCoverage),
  },
  {
    label: "Third-Party Required",
    accessor: (l) => pillYesNo(l.insuranceLiability.thirdPartyRequired),
  },
  {
    label: "Gov. Indemnification",
    accessor: (l) => pillYesNo(l.insuranceLiability.governmentIndemnification),
  },
  {
    label: "Indemnification Cap",
    accessor: (l) => txt(l.insuranceLiability.indemnificationCap),
  },
];

const DEBRIS_ROWS: RowDef[] = [
  {
    label: "Deorbit Requirement",
    accessor: (l) => pillYesNo(l.debrisMitigation.deorbitRequirement),
    emphasis: true,
  },
  {
    label: "Deorbit Timeline",
    accessor: (l) => txt(l.debrisMitigation.deorbitTimeline),
  },
  {
    label: "Passivation Required",
    accessor: (l) => pillYesNo(l.debrisMitigation.passivationRequired),
  },
  {
    label: "Mitigation Plan",
    accessor: (l) => pillYesNo(l.debrisMitigation.debrisMitigationPlan),
  },
  {
    label: "Collision Avoidance",
    accessor: (l) => pillYesNo(l.debrisMitigation.collisionAvoidance),
  },
  {
    label: "Standards",
    accessor: (l) => joinArr(l.debrisMitigation.standards),
  },
];

// NOTE: Processing Time + Application Fee rows removed for the same
// reason as in AUTH_ROWS — editorial estimates, not primary-source.
// Annual Fee + Other Costs kept (statutory where cited) but also
// on the watchlist for future cleanup if not verifiable.
const TIMELINE_ROWS: RowDef[] = [
  {
    label: "Annual Fee",
    accessor: (l) => txt(l.timeline.annualFee),
    emphasis: true,
  },
  {
    label: "Other Costs",
    accessor: (l) => joinArr(l.timeline.otherCosts, "None specified"),
  },
];

const EU_ROWS: RowDef[] = [
  {
    label: "Relationship",
    accessor: (l) => txt(l.euSpaceActCrossRef.relationship.toUpperCase()),
    emphasis: true,
  },
  {
    label: "Description",
    accessor: (l) => txt(l.euSpaceActCrossRef.description),
  },
  {
    label: "Key Articles",
    accessor: (l) => joinArr(l.euSpaceActCrossRef.keyArticles),
  },
  {
    label: "Transition Notes",
    accessor: (l) => txt(l.euSpaceActCrossRef.transitionNotes),
  },
];

const REGISTRATION_ROWS: RowDef[] = [
  {
    label: "National Registry",
    accessor: (l) => pillYesNo(l.registration.nationalRegistryExists),
    emphasis: true,
  },
  {
    label: "Registry Name",
    accessor: (l) => txt(l.registration.registryName),
  },
  {
    label: "UN Registration Required",
    accessor: (l) => pillYesNo(l.registration.unRegistrationRequired),
  },
];

const SECTIONS: SectionDef[] = [
  {
    key: "authorization",
    num: "01",
    label: "Authorization & Licensing",
    lede: "Competent authorities, enabling legislation, and the insurance posture required to file a national authorization application.",
    rows: AUTH_ROWS,
  },
  {
    key: "liability",
    num: "02",
    label: "Liability & Insurance",
    lede: "Liability regime applied to operators, mandatory coverage thresholds, and government indemnification provisions for third-party claims.",
    rows: LIABILITY_ROWS,
  },
  {
    key: "debris",
    num: "03",
    label: "Debris Mitigation",
    lede: "Deorbit obligations, passivation requirements, mitigation planning, and the technical standards each jurisdiction references.",
    rows: DEBRIS_ROWS,
  },
  {
    key: "timeline",
    num: "04",
    label: "Fees",
    lede: "Recurring and ancillary fees disclosed in the authorization workflow. Processing times and application fees are not shown because the figures available to Atlas are editorial estimates rather than statutory publications.",
    rows: TIMELINE_ROWS,
  },
  {
    key: "registration",
    num: "05",
    label: "Registration",
    lede: "National registry of space objects, obligations under the UN Registration Convention (1975), and data fields commonly required.",
    rows: REGISTRATION_ROWS,
  },
  {
    key: "eu_readiness",
    num: "06",
    label: "EU Space Act Readiness",
    lede: "Each national framework's relationship to the EU Space Act (COM(2025) 335) — complementary, gap, conflict — and the cross-referenced articles.",
    rows: EU_ROWS,
  },
];

const DIMENSION_LABELS: Record<string, string> = {
  all: "All Dimensions",
  authorization: "Authorization & Licensing",
  liability: "Liability & Insurance",
  debris: "Debris Mitigation",
  registration: "Registration",
  timeline: "Fees",
  eu_readiness: "EU Space Act Readiness",
};

// ─── Cell renderer ───

function Cell({ value }: { value: RowValue }) {
  if (value.kind === "pill-yes") {
    return <span className="print-pill print-pill-yes">{value.text}</span>;
  }
  if (value.kind === "pill-no") {
    return <span className="print-pill print-pill-no">{value.text}</span>;
  }
  if (value.kind === "pill-na") {
    return <span className="print-pill print-pill-na">{value.text}</span>;
  }
  return <span>{value.text}</span>;
}

// ─── At-a-Glance card derivation ───

interface GlanceCard {
  num: string;
  label: string;
  value: string;
  detail: string;
}

function deriveGlanceCards(
  jurisdictions: { code: SpaceLawCountryCode; data: JurisdictionLaw }[],
): GlanceCard[] {
  // NOTE: "Fastest Path" card removed — it was derived from
  // `typicalProcessingWeeks.max`, which is an editorial estimate. We
  // now lead with enacted-law coverage (verifiable against the
  // national gazette), then insurance, deorbit and registry posture.
  const mandatoryInsurance = jurisdictions.filter(
    (j) => j.data.insuranceLiability.mandatoryInsurance,
  );
  const voluntaryInsurance = jurisdictions.filter(
    (j) => !j.data.insuranceLiability.mandatoryInsurance,
  );

  const deorbitRequired = jurisdictions.filter(
    (j) => j.data.debrisMitigation.deorbitRequirement,
  );

  const hasRegistry = jurisdictions.filter(
    (j) => j.data.registration.nationalRegistryExists,
  );

  const enacted = jurisdictions.filter(
    (j) => j.data.legislation.status === "enacted",
  );

  return [
    {
      num: "01",
      label: "Enacted Frameworks",
      value: `${enacted.length} of ${jurisdictions.length}`,
      detail:
        enacted.length === jurisdictions.length
          ? "All selected jurisdictions operate under an enacted national space law"
          : enacted.length > 0
            ? `Enacted in: ${enacted.map((j) => j.code).join(" · ")}`
            : "None of the selected jurisdictions has an enacted dedicated space law",
    },
    {
      num: "02",
      label: "Mandatory Insurance",
      value: `${mandatoryInsurance.length} of ${jurisdictions.length}`,
      detail:
        mandatoryInsurance.length > 0
          ? `Mandatory in: ${mandatoryInsurance.map((j) => j.code).join(" · ")}`
          : "Voluntary across all selected jurisdictions",
    },
    {
      num: "03",
      label: "Deorbit Obligation",
      value: `${deorbitRequired.length} of ${jurisdictions.length}`,
      detail:
        deorbitRequired.length > 0
          ? `Required in: ${deorbitRequired.map((j) => j.code).join(" · ")}`
          : "No formal deorbit requirement in any selected jurisdiction",
    },
    {
      num: "04",
      label: "National Registry",
      value: `${hasRegistry.length} of ${jurisdictions.length}`,
      detail:
        voluntaryInsurance.length === 0
          ? "UN Registration Convention applies in all"
          : `UN Registration Convention applies in all; national registries: ${hasRegistry.map((j) => j.code).join(" · ") || "none"}`,
    },
  ];
}

// ─── Component ───

export default function ComparatorExport({
  countries,
  dimension,
}: ComparatorExportProps) {
  useLanguage(); // keeps language-context subscription for hook ordering

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
      ? SECTIONS
      : SECTIONS.filter((s) => s.key === dimension);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const isoDate = now.toISOString().slice(0, 10);

  const countryNames = jurisdictions.map((j) => j.data.countryName).join(" · ");
  const countryCodes = jurisdictions.map((j) => j.code).join(" / ");
  const dimensionLabel = DIMENSION_LABELS[dimension] || "All Dimensions";

  const glanceCards =
    dimension === "all" || sections.length > 1
      ? deriveGlanceCards(jurisdictions)
      : null;

  return (
    <div className="print-export-container" aria-hidden="true">
      {/* ══════════ COVER ══════════ */}
      <div className="print-cover">
        <div className="print-cover-top">
          <div className="print-cover-mark">Atlas</div>
          <div className="print-cover-mark-rule" />

          <div className="print-cover-kicker">Regulatory Briefing</div>
          <h1 className="print-cover-title">{countryNames}</h1>
          <p className="print-cover-subtitle">
            {dimensionLabel} — side-by-side analysis of {jurisdictions.length}{" "}
            European space-law frameworks, built on Atlas&apos;s primary-source
            regulatory database.
          </p>
        </div>

        <div className="print-cover-bottom">
          <div className="print-cover-rule" />
          <div className="print-cover-meta">
            <div className="print-cover-meta-label">Jurisdictions</div>
            <div className="print-cover-meta-value">{countryCodes}</div>

            <div className="print-cover-meta-label">Dimension</div>
            <div className="print-cover-meta-value">{dimensionLabel}</div>

            <div className="print-cover-meta-label">Prepared</div>
            <div className="print-cover-meta-value">{dateStr}</div>

            <div className="print-cover-meta-label">Data current</div>
            <div className="print-cover-meta-value">
              Last verified {isoDate}
            </div>

            <div className="print-cover-meta-label">Issuer</div>
            <div className="print-cover-meta-value">
              Caelex — Atlas Regulatory Intelligence
            </div>
          </div>
          <div className="print-cover-confidential">
            Confidential · Not legal advice
          </div>
        </div>
      </div>

      {/* ══════════ AT A GLANCE ══════════ */}
      {glanceCards && (
        <div className="print-glance">
          <div className="print-glance-header">
            <div className="print-glance-kicker">Executive Summary</div>
            <h2 className="print-glance-title">At a Glance</h2>
            <div className="print-glance-rule" />
          </div>
          <div className="print-glance-grid">
            {glanceCards.map((card) => (
              <div key={card.num} className="print-glance-card">
                <div className="print-glance-card-num">{card.num}</div>
                <div className="print-glance-card-label">{card.label}</div>
                <div className="print-glance-card-value">{card.value}</div>
                <div className="print-glance-card-detail">{card.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ DATA SECTIONS ══════════ */}
      {sections.map((section) => (
        <div key={section.key} className="print-section">
          <div className="print-section-header">
            <div className="print-section-num">{section.num}</div>
            <h2 className="print-section-title">{section.label}</h2>
          </div>
          <div className="print-section-rule" />
          <p className="print-section-lede">{section.lede}</p>

          <table className="print-table">
            <thead>
              <tr>
                <th className="print-table-provision">Provision</th>
                {jurisdictions.map(({ code, data }) => (
                  <th key={code} className="print-table-country">
                    {data.countryName}
                    <span className="print-table-code">({code})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className={row.emphasis ? "print-row-emphasis" : ""}
                >
                  <td className="print-table-label">{row.label}</td>
                  {jurisdictions.map(({ code, data }) => (
                    <td key={code} className="print-table-cell">
                      <Cell value={row.accessor(data)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* ══════════ APPENDIX — Sources, Methodology, Disclaimer ══════════ */}
      <div className="print-appendix">
        <div className="print-appendix-section">
          <h3 className="print-appendix-title">Sources</h3>
          <ul className="print-appendix-list">
            {jurisdictions.map(({ code, data }) => (
              <li key={code}>
                <span className="print-appendix-ref">{data.countryName}</span>
                {" — "}
                {data.legislation.name}
                {data.legislation.officialUrl
                  ? ` · ${data.legislation.officialUrl}`
                  : ""}
                {data.lastUpdated ? ` · last updated ${data.lastUpdated}` : ""}
              </li>
            ))}
          </ul>
        </div>

        <div className="print-appendix-section">
          <h3 className="print-appendix-title">Methodology</h3>
          <p className="print-appendix-body">
            This briefing draws on Atlas&apos;s curated database of European
            space-law jurisdictions. Each row is sourced from primary national
            gazettes or equivalent official registers and cross-referenced
            against the UN depositary of space treaties. Comparative cells use a
            four-state monochrome encoding: filled circle (●) for an affirmative
            finding, outlined circle (○) for a negative finding, dashed circle
            for not-applicable, and plain text for numeric or qualitative
            values. Data currency is reflected in the cover-page{" "}
            <em>Data current</em> field; individual source-verification dates
            are maintained on each jurisdiction&apos;s detail view in Atlas.
          </p>
        </div>

        <div className="print-appendix-section">
          <h3 className="print-appendix-title">Legal Disclaimer</h3>
          <p className="print-disclaimer">
            This briefing is provided for regulatory-intelligence purposes only
            and does not constitute legal advice, a legal opinion, or a
            substitute for qualified counsel. Regulations, authorities, and
            processing timelines change frequently; always verify current
            primary sources before making compliance decisions, submitting
            filings, or communicating obligations to stakeholders. Caelex and
            Atlas disclaim all liability for decisions taken in reliance on this
            document. Confidential — prepared for the named recipient only;
            redistribution requires written consent.
          </p>
        </div>
      </div>
    </div>
  );
}
