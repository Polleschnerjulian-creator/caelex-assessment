"use client";

import type {
  LegalSource,
  Authority,
  KeyProvision,
} from "@/data/legal-sources";
import {
  getTranslatedSource,
  getTranslatedAuthority,
} from "@/data/legal-sources";
import type {
  SpaceLawCountryCode,
  JurisdictionLaw,
} from "@/lib/space-law-types";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import { useFirmBranding } from "./useFirmBranding";

/**
 * JurisdictionExport — Atlas PDF briefing for a single jurisdiction detail page.
 *
 * Same design system as ComparatorExport (Linear / Palantir monochrome):
 *
 *   Page 1      COVER              .print-cover
 *   Page 2      KEY FACTS (glance) .print-glance
 *   Pages 3+    LEGAL SOURCES      .print-section (one per group)
 *   Sub-page    COMPETENT AUTHORITIES .print-section
 *   Last page   APPENDIX           .print-appendix
 *
 * Layout primitives live in globals.css under the
 * "ATLAS BRIEFING — PRINT / PDF EXPORT" block. This component is
 * hidden on screen via .print-export-container and only surfaces
 * inside @media print.
 */

interface SourceGroup {
  key: string;
  title: string;
  sources: LegalSource[];
}

interface JurisdictionExportProps {
  code: string;
  jurisdiction: JurisdictionLaw;
  legalSources: LegalSource[];
  authorities: Authority[];
  groupedSources: SourceGroup[];
  language: string;
}

// ─── Key Facts cards — derived from jurisdiction data ───

function deriveKeyFacts(
  j: JurisdictionLaw,
): Array<{ num: string; label: string; value: string; detail: string }> {
  // NOTE: "Processing Timeline" card removed — the source figures
  // (typicalProcessingWeeks, applicationFee) are editorial estimates.
  // We replace it with a Registration card, which is verifiable
  // against the national registry name / UN registration status.
  const mandatory = j.insuranceLiability.mandatoryInsurance;
  const coverage = j.insuranceLiability.minimumCoverage?.trim();

  const regime = j.insuranceLiability.liabilityRegime.toUpperCase();
  const govIndemn = j.insuranceLiability.governmentIndemnification;

  const registryStr = j.registration.nationalRegistryExists
    ? j.registration.registryName?.trim() || "National registry maintained"
    : "No national registry";

  return [
    {
      num: "01",
      label: "Enabling Legislation",
      value: j.legislation.name,
      detail: `${j.legislation.yearEnacted ? `Enacted ${j.legislation.yearEnacted}` : "Year unknown"} · Status: ${j.legislation.status.toUpperCase()}`,
    },
    {
      num: "02",
      label: "Licensing Authority",
      value: j.licensingAuthority.name,
      detail: j.licensingAuthority.parentMinistry
        ? `Parent: ${j.licensingAuthority.parentMinistry}`
        : "Competent national authority for authorization and supervision",
    },
    {
      num: "03",
      label: "Registration",
      value: registryStr,
      detail: j.registration.unRegistrationRequired
        ? "UN Registration Convention (1975) applies"
        : "UN Registration Convention not required",
    },
    {
      num: "04",
      label: "Insurance & Liability",
      value: mandatory
        ? `Mandatory${coverage ? ` · ${coverage}` : ""}`
        : "Voluntary",
      detail: `Regime: ${regime}${govIndemn ? " · Gov. indemnification available" : ""}`,
    },
  ];
}

// ─── Provision line renderer ───

function ProvisionLine({
  provision,
  translatedSummary,
}: {
  provision: KeyProvision;
  translatedSummary: string | null;
}) {
  return (
    <div className="print-source-provision">
      <span className="print-source-provision-section">
        {provision.section}
      </span>
      {translatedSummary ?? provision.summary}
    </div>
  );
}

// ─── Component ───

export default function JurisdictionExport({
  code,
  jurisdiction,
  legalSources,
  authorities,
  groupedSources,
  language,
}: JurisdictionExportProps) {
  const firm = useFirmBranding();
  const isDe = language === "de";

  const now = new Date();
  // Locale-aware date format — German pilot expects DD.MM.YYYY-style.
  const dateStr = now.toLocaleDateString(isDe ? "de-DE" : "en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const isoDate = now.toISOString().slice(0, 10);

  // Locale-aware export chrome — without these the German pilot
  // exports a half-translated artifact (data is bilingual but
  // headers/disclaimer/methodology hardcoded English).
  const chrome = isDe
    ? {
        kicker: "Regulatorisches Briefing",
        confidential: "Vertraulich · Keine Rechtsberatung",
        glanceKicker: "Zusammenfassung",
        glanceTitle: "Auf einen Blick",
        jurisdictionLabel: "Jurisdiktion",
        legalSourcesLabel: "Rechtsquellen",
        legalSourcesIndexed: "indiziert",
        authoritiesLabel: "Behörden",
        dataCurrentLabel: "Daten-Stand",
        lastVerifiedTpl: (d: string) => `Zuletzt geprüft ${d}`,
        preparedLabel: "Erstellt",
        issuerLabel: "Aussteller",
        issuerName: firm.name
          ? `${firm.name} — Atlas / Caelex`
          : "Caelex · Atlas Regulatory Intelligence",
        methodologyTitle: "Methodik",
        disclaimerTitle: "Rechtlicher Hinweis",
        methodologyBody: (
          <>
            Dieses Briefing basiert auf der kuratierten Atlas-Datenbank für{" "}
            <strong>
              {jurisdiction.countryName} ({code})
            </strong>
            . Jede aufgeführte Rechtsquelle ist gegen das nationale Amtsblatt
            oder ein gleichwertiges offizielles Register cross-referenziert.
            Internationale Verträge sind anhand des UN-Depositärs für
            Weltraumverträge geprüft. Das Feld <em>Daten-Stand</em> auf der
            Coverseite spiegelt die jüngste Verifikation wider; einzelne
            Quellen-Verifikationsdaten sind in der jeweiligen
            Atlas-Detailansicht gepflegt.
          </>
        ),
        disclaimerBody: (
          <>
            Dieses Briefing dient ausschließlich regulatorischen
            Informationszwecken und stellt weder Rechtsberatung noch ein
            Rechtsgutachten dar und ersetzt keine qualifizierte anwaltliche
            Beratung. Vorschriften, Behörden und Bearbeitungszeiten ändern sich
            häufig; verifizieren Sie stets die aktuellen Primärquellen, bevor
            Sie Compliance-Entscheidungen treffen, Anträge einreichen oder
            Verpflichtungen an Stakeholder kommunizieren. Caelex und Atlas
            lehnen jede Haftung für Entscheidungen ab, die im Vertrauen auf
            dieses Dokument getroffen werden. Vertraulich — ausschließlich für
            den genannten Empfänger erstellt; Weitergabe nur mit schriftlicher
            Zustimmung.
          </>
        ),
      }
    : {
        kicker: "Regulatory Briefing",
        confidential: "Confidential · Not legal advice",
        glanceKicker: "Executive Summary",
        glanceTitle: "At a Glance",
        jurisdictionLabel: "Jurisdiction",
        legalSourcesLabel: "Legal sources",
        legalSourcesIndexed: "indexed",
        authoritiesLabel: "Authorities",
        dataCurrentLabel: "Data current",
        lastVerifiedTpl: (d: string) => `Last verified ${d}`,
        preparedLabel: "Prepared",
        issuerLabel: "Issuer",
        issuerName: firm.name
          ? `${firm.name} — powered by Atlas / Caelex`
          : "Caelex · Atlas Regulatory Intelligence",
        methodologyTitle: "Methodology",
        disclaimerTitle: "Legal Disclaimer",
        methodologyBody: (
          <>
            This briefing draws on Atlas&apos;s curated database for{" "}
            <strong>
              {jurisdiction.countryName} ({code})
            </strong>
            . Every legal source listed is cross-referenced against the national
            gazette or equivalent official register. International treaties are
            verified against the UN depositary of space treaties. The cover-page{" "}
            <em>Data current</em> field reflects the most recent verification;
            individual source-verification dates are maintained on each
            entry&apos;s detail view in Atlas.
          </>
        ),
        disclaimerBody: (
          <>
            This briefing is provided for regulatory-intelligence purposes only
            and does not constitute legal advice, a legal opinion, or a
            substitute for qualified counsel. Regulations, authorities, and
            processing timelines change frequently; always verify current
            primary sources before making compliance decisions, submitting
            filings, or communicating obligations to stakeholders. Caelex and
            Atlas disclaim all liability for decisions taken in reliance on this
            document. Confidential — prepared for the named recipient only;
            redistribution requires written consent.
          </>
        ),
      };

  // Subtitle for cover — derive a crisp one-line summary
  const hasDedicatedLaw = jurisdiction.legislation.status === "enacted";
  const coverSubtitle = hasDedicatedLaw
    ? isDe
      ? `${jurisdiction.legislation.name} (${jurisdiction.legislation.yearEnacted}) — maßgeblicher Rahmen für nationale Raumfahrtaktivitäten in ${jurisdiction.countryName}.`
      : `${jurisdiction.legislation.name} (${jurisdiction.legislation.yearEnacted}) — authoritative framework for national space activities in ${jurisdiction.countryName}.`
    : isDe
      ? `${jurisdiction.countryName} arbeitet mit einem sektoralen Übergangsrahmen — kein eigenständiges nationales Raumfahrtgesetz. Der EU Space Act gilt direkt, sobald in Kraft.`
      : `${jurisdiction.countryName} operates under an interim sectoral framework — no dedicated national space law. EU Space Act applies directly once in force.`;

  const keyFacts = deriveKeyFacts(jurisdiction);

  return (
    <div className="print-export-container" aria-hidden="true">
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
          <h1 className="print-cover-title">
            {jurisdiction.countryName}{" "}
            <span className="print-cover-title-suffix">{code}</span>
          </h1>
          <p className="print-cover-subtitle">{coverSubtitle}</p>
        </div>

        <div className="print-cover-bottom">
          <div className="print-cover-rule" />
          <div className="print-cover-meta">
            <div className="print-cover-meta-label">
              {chrome.jurisdictionLabel}
            </div>
            <div className="print-cover-meta-value">
              {jurisdiction.countryName} ({code})
            </div>

            <div className="print-cover-meta-label">
              {chrome.legalSourcesLabel}
            </div>
            <div className="print-cover-meta-value">
              {legalSources.length} {chrome.legalSourcesIndexed}
            </div>

            <div className="print-cover-meta-label">
              {chrome.authoritiesLabel}
            </div>
            <div className="print-cover-meta-value">
              {authorities.length}
              {isDe ? " zuständige Stellen" : " competent bodies"}
            </div>

            <div className="print-cover-meta-label">{chrome.preparedLabel}</div>
            <div className="print-cover-meta-value">{dateStr}</div>

            <div className="print-cover-meta-label">
              {chrome.dataCurrentLabel}
            </div>
            <div className="print-cover-meta-value">
              {chrome.lastVerifiedTpl(jurisdiction.lastUpdated || isoDate)}
            </div>

            <div className="print-cover-meta-label">{chrome.issuerLabel}</div>
            <div className="print-cover-meta-value">{chrome.issuerName}</div>
          </div>
          <div className="print-cover-confidential">{chrome.confidential}</div>
        </div>
      </div>

      {/* ══════════ AT A GLANCE — Key Facts ══════════ */}
      <div className="print-glance">
        <div className="print-glance-header">
          <div className="print-glance-kicker">{chrome.glanceKicker}</div>
          <h2 className="print-glance-title">{chrome.glanceTitle}</h2>
          <div className="print-glance-rule" />
        </div>
        <div className="print-glance-grid">
          {keyFacts.map((card) => (
            <div key={card.num} className="print-glance-card">
              <div className="print-glance-card-num">{card.num}</div>
              <div className="print-glance-card-label">{card.label}</div>
              <div className="print-glance-card-value">{card.value}</div>
              <div className="print-glance-card-detail">{card.detail}</div>
            </div>
          ))}
        </div>

        {/* EU Space Act relationship callout — rendered only when present */}
        {jurisdiction.euSpaceActCrossRef?.description ? (
          <div className="print-callout" style={{ marginTop: "28pt" }}>
            <div className="print-callout-label">
              EU Space Act · Relationship:{" "}
              {jurisdiction.euSpaceActCrossRef.relationship.toUpperCase()}
            </div>
            <div className="print-callout-body">
              {jurisdiction.euSpaceActCrossRef.description}
            </div>
          </div>
        ) : null}
      </div>

      {/* ══════════ LEGAL SOURCES — one section per group ══════════ */}
      {groupedSources.map((group, gIdx) => {
        const num = String(gIdx + 1).padStart(2, "0");
        return (
          <div key={group.key} className="print-section">
            <div className="print-section-header">
              <div className="print-section-num">{num}</div>
              <h2 className="print-section-title">
                {group.title}
                <span className="print-section-count">
                  ({group.sources.length})
                </span>
              </h2>
            </div>
            <div className="print-section-rule" />

            <div className="print-source-list">
              {group.sources.map((source) => {
                const translated = getTranslatedSource(source, language);
                const meta = [
                  source.official_reference,
                  source.date_enacted || source.date_in_force,
                  source.status.replace(/_/g, " ").toUpperCase(),
                  source.relevance_level.toUpperCase(),
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <div key={source.id} className="print-source-card">
                    <div className="print-source-title">{translated.title}</div>
                    <div className="print-source-meta">{meta}</div>
                    {source.scope_description ? (
                      <div className="print-source-body">
                        {translated.scopeDescription ??
                          source.scope_description}
                      </div>
                    ) : null}
                    {source.key_provisions.length > 0 ? (
                      <div className="print-source-provisions">
                        {source.key_provisions.slice(0, 3).map((p, i) => (
                          <ProvisionLine
                            key={i}
                            provision={p}
                            translatedSummary={
                              translated.getProvisionTranslation(p.section)
                                ?.summary ?? null
                            }
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ══════════ COMPETENT AUTHORITIES ══════════ */}
      {authorities.length > 0 ? (
        <div className="print-section">
          <div className="print-section-header">
            <div className="print-section-num">
              {String(groupedSources.length + 1).padStart(2, "0")}
            </div>
            <h2 className="print-section-title">
              {isDe ? "Zuständige Behörden" : "Competent Authorities"}
              <span className="print-section-count">
                ({authorities.length})
              </span>
            </h2>
          </div>
          <div className="print-section-rule" />
          <p className="print-section-lede">
            {isDe
              ? `Nationale Behörden mit Zuständigkeit für Genehmigung, Frequenzen, Cybersicherheit, Exportkontrolle und Datenschutz für Raumfahrtbetreiber in ${jurisdiction.countryName}.`
              : `National authorities with jurisdiction over authorization, spectrum, cybersecurity, export control, and data protection as they apply to ${jurisdiction.countryName} space operators.`}
          </p>

          <table className="print-table">
            <colgroup>
              <col style={{ width: "14%" }} />
              <col style={{ width: "30%" }} />
              <col style={{ width: "56%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>{isDe ? "Kürzel" : "Abbr."}</th>
                <th>{isDe ? "Behörde" : "Authority"}</th>
                <th>{isDe ? "Mandat" : "Mandate"}</th>
              </tr>
            </thead>
            <tbody>
              {authorities.map((auth) => {
                const ta = getTranslatedAuthority(auth, language);
                const mandate =
                  ta.mandate.length > 260
                    ? ta.mandate.slice(0, 260).trimEnd() + "…"
                    : ta.mandate;
                return (
                  <tr key={auth.id}>
                    <td className="print-authority-abbr">
                      {auth.abbreviation}
                    </td>
                    <td>{ta.name}</td>
                    <td className="print-authority-mandate">{mandate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* ══════════ APPENDIX — Methodology + Disclaimer ══════════ */}
      <div className="print-appendix">
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

// Re-export type guard for pages using this component with JURISDICTION_DATA
export function isValidJurisdictionCode(
  code: string,
): code is SpaceLawCountryCode {
  return JURISDICTION_DATA.has(code as SpaceLawCountryCode);
}
