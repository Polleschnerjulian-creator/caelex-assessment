"use client";

import { useMemo } from "react";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import type {
  SpaceLawCountryCode,
  JurisdictionLaw,
} from "@/lib/space-law-types";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useFirmBranding } from "./useFirmBranding";

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
      // Fixed: previously gated the detail text on
      // `voluntaryInsurance.length === 0`, which is unrelated to the
      // registry card. The correct discriminant is whether any
      // national registry is present.
      num: "04",
      label: "National Registry",
      value: `${hasRegistry.length} of ${jurisdictions.length}`,
      detail:
        hasRegistry.length === jurisdictions.length
          ? "National registry maintained in every selected jurisdiction"
          : hasRegistry.length === 0
            ? "No national registry maintained — UN Registration Convention may still apply"
            : `National registry in: ${hasRegistry.map((j) => j.code).join(" · ")}`,
    },
  ];
}

// ─── Component ───

export default function ComparatorExport({
  countries,
  dimension,
}: ComparatorExportProps) {
  const { language } = useLanguage();
  const isDe = language === "de";
  const firm = useFirmBranding();

  // Locale-aware chrome strings — without these the German pilot
  // exports a half-translated artifact (data is bilingual but
  // headers/disclaimer/methodology hardcoded English).
  const chrome = isDe
    ? {
        kicker: "Regulatorisches Briefing",
        coverSubtitleTpl: (n: number, dim: string) =>
          `${dim} — vergleichende Analyse von ${n} europäischen Raumfahrtgesetz-Rahmen, gestützt auf die Atlas-Primärquellen-Datenbank.`,
        jurisdictionsLabel: "Jurisdiktionen",
        dimensionLabel: "Bereich",
        preparedLabel: "Erstellt",
        dataCurrentLabel: "Daten-Stand",
        lastVerifiedTpl: (d: string) => `Zuletzt geprüft ${d}`,
        issuerLabel: "Aussteller",
        issuerName: "Caelex — Atlas Regulatory Intelligence",
        confidential: "Vertraulich · Keine Rechtsberatung",
        glanceKicker: "Zusammenfassung",
        glanceTitle: "Auf einen Blick",
        provisionHeader: "Bestimmung",
        sourcesTitle: "Quellen",
        methodologyTitle: "Methodik",
        disclaimerTitle: "Rechtlicher Hinweis",
        methodologyBody:
          'Dieses Briefing basiert auf der kuratierten Atlas-Datenbank europäischer Raumfahrtjurisdiktionen. Jede Zeile stammt aus nationalen Amtsblättern oder gleichwertigen offiziellen Registern und ist gegen das UN-Depositär für Weltraumverträge gegengeprüft. Vergleichszellen verwenden eine vier-stufige monochrome Kodierung: gefüllter Kreis (●) für eine bejahende Feststellung, offener Kreis (○) für eine verneinende Feststellung, gestrichelter Kreis für nicht-anwendbar, und Klartext für numerische oder qualitative Werte. Die Datenaktualität ist auf der Cover-Seite im Feld „Daten-Stand" angegeben; einzelne Quellen-Verifikationsdaten werden in der jeweiligen Atlas-Detailansicht gepflegt.',
        disclaimerBody:
          "Dieses Briefing dient ausschließlich regulatorischen Informationszwecken und stellt weder Rechtsberatung noch ein Rechtsgutachten dar und ersetzt keine qualifizierte anwaltliche Beratung. Vorschriften, Behörden und Bearbeitungszeiten ändern sich häufig; verifizieren Sie stets die aktuellen Primärquellen, bevor Sie Compliance-Entscheidungen treffen, Anträge einreichen oder Verpflichtungen an Stakeholder kommunizieren. Caelex und Atlas lehnen jede Haftung für Entscheidungen ab, die im Vertrauen auf dieses Dokument getroffen werden. Vertraulich — ausschließlich für den genannten Empfänger erstellt; Weitergabe nur mit schriftlicher Zustimmung.",
      }
    : {
        kicker: "Regulatory Briefing",
        coverSubtitleTpl: (n: number, dim: string) =>
          `${dim} — side-by-side analysis of ${n} European space-law frameworks, built on Atlas's primary-source regulatory database.`,
        jurisdictionsLabel: "Jurisdictions",
        dimensionLabel: "Dimension",
        preparedLabel: "Prepared",
        dataCurrentLabel: "Data current",
        lastVerifiedTpl: (d: string) => `Last verified ${d}`,
        issuerLabel: "Issuer",
        issuerName: "Caelex — Atlas Regulatory Intelligence",
        confidential: "Confidential · Not legal advice",
        glanceKicker: "Executive Summary",
        glanceTitle: "At a Glance",
        provisionHeader: "Provision",
        sourcesTitle: "Sources",
        methodologyTitle: "Methodology",
        disclaimerTitle: "Legal Disclaimer",
        methodologyBody:
          "This briefing draws on Atlas's curated database of European space-law jurisdictions. Each row is sourced from primary national gazettes or equivalent official registers and cross-referenced against the UN depositary of space treaties. Comparative cells use a four-state monochrome encoding: filled circle (●) for an affirmative finding, outlined circle (○) for a negative finding, dashed circle for not-applicable, and plain text for numeric or qualitative values. Data currency is reflected in the cover-page “Data current” field; individual source-verification dates are maintained on each jurisdiction's detail view in Atlas.",
        disclaimerBody:
          "This briefing is provided for regulatory-intelligence purposes only and does not constitute legal advice, a legal opinion, or a substitute for qualified counsel. Regulations, authorities, and processing timelines change frequently; always verify current primary sources before making compliance decisions, submitting filings, or communicating obligations to stakeholders. Caelex and Atlas disclaim all liability for decisions taken in reliance on this document. Confidential — prepared for the named recipient only; redistribution requires written consent.",
      };

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
  // Locale-aware date format — German pilot expects DD.MM.YYYY.
  const dateStr = now.toLocaleDateString(isDe ? "de-DE" : "en-GB", {
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

  // ─── Layout sizing rules ───
  //
  // Cover title font-size scales down as more jurisdictions are
  // joined into one line, so e.g. "France · Germany · Luxembourg ·
  // United Kingdom · Netherlands" doesn't wrap into four ugly lines
  // at the default 48pt.
  //
  // Likewise, data tables with many countries need tighter typography
  // to keep rows readable and avoid horizontal overflow on A4
  // portrait (~174mm usable width).
  const coverTitleClass =
    jurisdictions.length >= 5
      ? "print-cover-title is-small"
      : jurisdictions.length >= 3
        ? "print-cover-title is-medium"
        : "print-cover-title";

  const sectionExtraClass = jurisdictions.length >= 6 ? "print-wide-table" : "";

  // With 5+ jurisdictions, A4 portrait (≈174mm usable) gives each
  // country column ≤30mm — too narrow for readable text even with
  // the wide-table modifier. In that case we inject a page-level
  // landscape override so the whole PDF prints in A4 landscape
  // (297×210mm content), giving ~40mm per country column at N=6 and
  // still enough at N=10+.
  //
  // The <style> below is global but harmless: it only matters inside
  // @media print, and only when THIS comparator component is on the
  // page (JurisdictionExport is on a different route). No other
  // export shares this render tree.
  const needsLandscape = jurisdictions.length >= 5;

  return (
    <div className="print-export-container" aria-hidden="true">
      {needsLandscape ? (
        <style
          id="atlas-comparator-landscape-page"
          // Inline <style> is the only way to override @page size
          // from inside a React tree — @page rules can't be scoped
          // by selector. Also shrinks .print-cover min-height from
          // 257mm (portrait content area) to 170mm (landscape content
          // area) so the cover fills a landscape page instead of
          // overflowing onto a second one.
          //
          // Scoping note: this rule is GLOBAL while the component is
          // mounted, but ComparatorExport unmounts on route change
          // (jurisdictions/[code] is a different route group) so the
          // landscape rule does NOT leak into other Atlas exports.
          // The unique id makes the rule findable in devtools if a
          // future surface ever does mount Comparator alongside
          // another export.
          //
          // The print-cover-meta grid only fills half a landscape
          // page width by design — we keep the original layout and
          // accept the empty right half on the cover so the data
          // sections (which span full landscape width) stay readable.
          dangerouslySetInnerHTML={{
            __html: `@media print {
              @page { size: A4 landscape; margin: 16mm 18mm 18mm 18mm; }
              .print-cover { min-height: 170mm; }
            }`,
          }}
        />
      ) : null}

      {/* ══════════ COVER ══════════ */}
      <div className="print-cover">
        <div className="print-cover-top">
          <div className="print-cover-brandrow">
            <div>
              <div className="print-cover-mark">Atlas</div>
              <div className="print-cover-mark-rule" />
            </div>
            {firm.logo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={firm.logo}
                alt={firm.name ? `${firm.name} logo` : "Firm logo"}
                className="print-cover-firmlogo"
              />
            ) : null}
          </div>

          <div className="print-cover-kicker">{chrome.kicker}</div>
          <h1 className={coverTitleClass}>{countryNames}</h1>
          <p className="print-cover-subtitle">
            {chrome.coverSubtitleTpl(jurisdictions.length, dimensionLabel)}
          </p>
        </div>

        <div className="print-cover-bottom">
          <div className="print-cover-rule" />
          <div className="print-cover-meta">
            <div className="print-cover-meta-label">
              {chrome.jurisdictionsLabel}
            </div>
            <div className="print-cover-meta-value">{countryCodes}</div>

            <div className="print-cover-meta-label">
              {chrome.dimensionLabel}
            </div>
            <div className="print-cover-meta-value">{dimensionLabel}</div>

            <div className="print-cover-meta-label">{chrome.preparedLabel}</div>
            <div className="print-cover-meta-value">{dateStr}</div>

            <div className="print-cover-meta-label">
              {chrome.dataCurrentLabel}
            </div>
            <div className="print-cover-meta-value">
              {chrome.lastVerifiedTpl(isoDate)}
            </div>

            <div className="print-cover-meta-label">{chrome.issuerLabel}</div>
            <div className="print-cover-meta-value">{chrome.issuerName}</div>
          </div>
          <div className="print-cover-confidential">{chrome.confidential}</div>
        </div>
      </div>

      {/* ══════════ AT A GLANCE ══════════ */}
      {glanceCards && (
        <div className="print-glance">
          <div className="print-glance-header">
            <div className="print-glance-kicker">{chrome.glanceKicker}</div>
            <h2 className="print-glance-title">{chrome.glanceTitle}</h2>
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
        <div
          key={section.key}
          className={`print-section ${sectionExtraClass}`.trim()}
        >
          <div className="print-section-header">
            <div className="print-section-num">{section.num}</div>
            <h2 className="print-section-title">{section.label}</h2>
          </div>
          <div className="print-section-rule" />
          <p className="print-section-lede">{section.lede}</p>

          <table className="print-table">
            <thead>
              <tr>
                <th className="print-table-provision">
                  {chrome.provisionHeader}
                </th>
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
          <h3 className="print-appendix-title">{chrome.sourcesTitle}</h3>
          <ul className="print-appendix-list">
            {jurisdictions.map(({ code, data }) => (
              <li key={code}>
                <span className="print-appendix-ref">{data.countryName}</span>
                {" — "}
                {data.legislation.name}
                {data.legislation.officialUrl
                  ? ` · ${data.legislation.officialUrl}`
                  : ""}
                {data.lastUpdated
                  ? ` · ${isDe ? "zuletzt aktualisiert" : "last updated"} ${data.lastUpdated}`
                  : ""}
              </li>
            ))}
          </ul>
        </div>

        <div className="print-appendix-section">
          <h3 className="print-appendix-title">{chrome.methodologyTitle}</h3>
          <p className="print-appendix-body">{chrome.methodologyBody}</p>
        </div>

        <div className="print-appendix-section">
          <h3 className="print-appendix-title">{chrome.disclaimerTitle}</h3>
          <p className="print-disclaimer">{chrome.disclaimerBody}</p>
        </div>
      </div>
    </div>
  );
}
