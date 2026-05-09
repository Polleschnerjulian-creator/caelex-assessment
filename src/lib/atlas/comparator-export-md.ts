/**
 * Atlas Lawyer-UX-Audit F-COMP-1 — comparator markdown export.
 *
 * The /atlas/comparator page already exports as PDF via window.print()
 * + ComparatorExport's bespoke print-only layout. The audit's ask was
 * a Word/DOCX export so partners can paste the comparison into a
 * memo without re-keying. This helper turns the comparator's data
 * (JURISDICTION_DATA × dimension × selected codes) into a markdown
 * artifact the existing exportDraftAsWord pipeline can wrap in a
 * Word-flavoured HTML download.
 *
 * Why markdown not docx-direct: the draft-export pipeline is the
 * single source-of-truth for our document chrome (running header,
 * footer, page numbers, locale, disclaimer back-stop). Adding a
 * second docx-emit path would fork the chrome guarantees. Far
 * cheaper to render markdown here, run it through markdownToWordHtml
 * for free.
 */

import type { SpaceLawCountryCode } from "@/lib/space-law-types";
import type { JurisdictionLaw } from "@/lib/space-law-types";

export type ComparatorDimension =
  | "all"
  | "authorization"
  | "liability"
  | "debris"
  | "registration"
  | "timeline"
  | "eu_readiness";

export type ComparatorLocale = "en" | "de";

const DIMENSION_TITLE: Record<ComparatorDimension, { en: string; de: string }> =
  {
    all: { en: "All dimensions", de: "Alle Dimensionen" },
    authorization: {
      en: "Authorization & licensing",
      de: "Genehmigung & Lizenzierung",
    },
    liability: { en: "Liability & insurance", de: "Haftung & Versicherung" },
    debris: { en: "Debris mitigation", de: "Trümmerminderung" },
    registration: { en: "Registration", de: "Registrierung" },
    timeline: { en: "Timeline & costs", de: "Verfahren & Kosten" },
    eu_readiness: {
      en: "EU Space Act readiness",
      de: "EU Space Act-Bereitschaft",
    },
  };

const TR = (locale: ComparatorLocale, en: string, de: string): string =>
  locale === "de" ? de : en;

/* ── Per-dimension row builders ─────────────────────────────────────
 * Each builder returns header-row + per-country body-rows for ONE
 * dimension. Cells are short — markdown tables wrap badly in Word
 * when cells exceed ~40 chars. Long-form context goes in the row
 * footer, not the table. */

function authorizationRows(
  countries: JurisdictionLaw[],
  locale: ComparatorLocale,
): string[][] {
  const header = [
    TR(locale, "Country", "Land"),
    TR(locale, "Legislation", "Gesetz"),
    TR(locale, "Status", "Status"),
    TR(locale, "Authority", "Behörde"),
  ];
  const body = countries.map((c) => [
    `${c.flagEmoji} ${c.countryName}`,
    `${c.legislation.name} (${c.legislation.yearEnacted}${c.legislation.yearAmended ? `, am. ${c.legislation.yearAmended}` : ""})`,
    c.legislation.status,
    c.licensingAuthority.name,
  ]);
  return [header, ...body];
}

function liabilityRows(
  countries: JurisdictionLaw[],
  locale: ComparatorLocale,
): string[][] {
  const header = [
    TR(locale, "Country", "Land"),
    TR(locale, "Mandatory ins.", "Pflichtvers."),
    TR(locale, "Min. coverage", "Mindestdeckung"),
    TR(locale, "Liability regime", "Haftungsregime"),
    TR(locale, "Cap", "Höchstbetrag"),
  ];
  const body = countries.map((c) => [
    `${c.flagEmoji} ${c.countryName}`,
    c.insuranceLiability.mandatoryInsurance
      ? TR(locale, "Yes", "Ja")
      : TR(locale, "No", "Nein"),
    c.insuranceLiability.minimumCoverage ?? "—",
    c.insuranceLiability.liabilityRegime,
    c.insuranceLiability.liabilityCap ?? "—",
  ]);
  return [header, ...body];
}

function debrisRows(
  countries: JurisdictionLaw[],
  locale: ComparatorLocale,
): string[][] {
  const header = [
    TR(locale, "Country", "Land"),
    TR(locale, "Deorbit req.", "Deorbit-Pflicht"),
    TR(locale, "Timeline", "Frist"),
    TR(locale, "Passivation", "Passivierung"),
    TR(locale, "Plan req.", "Plan-Pflicht"),
  ];
  const body = countries.map((c) => [
    `${c.flagEmoji} ${c.countryName}`,
    c.debrisMitigation.deorbitRequirement
      ? TR(locale, "Yes", "Ja")
      : TR(locale, "No", "Nein"),
    c.debrisMitigation.deorbitTimeline ?? "—",
    c.debrisMitigation.passivationRequired
      ? TR(locale, "Yes", "Ja")
      : TR(locale, "No", "Nein"),
    c.debrisMitigation.debrisMitigationPlan
      ? TR(locale, "Yes", "Ja")
      : TR(locale, "No", "Nein"),
  ]);
  return [header, ...body];
}

function registrationRows(
  countries: JurisdictionLaw[],
  locale: ComparatorLocale,
): string[][] {
  const header = [
    TR(locale, "Country", "Land"),
    TR(locale, "National registry", "Nationales Register"),
    TR(locale, "Registry name", "Registername"),
    TR(locale, "UN registration", "UN-Registrierung"),
  ];
  const body = countries.map((c) => [
    `${c.flagEmoji} ${c.countryName}`,
    c.registration.nationalRegistryExists
      ? TR(locale, "Yes", "Ja")
      : TR(locale, "No", "Nein"),
    c.registration.registryName ?? "—",
    c.registration.unRegistrationRequired
      ? TR(locale, "Yes", "Ja")
      : TR(locale, "No", "Nein"),
  ]);
  return [header, ...body];
}

function timelineRows(
  countries: JurisdictionLaw[],
  locale: ComparatorLocale,
): string[][] {
  const header = [
    TR(locale, "Country", "Land"),
    TR(locale, "Processing (weeks)", "Bearbeitung (Wochen)"),
    TR(locale, "Application fee", "Antragsgebühr"),
    TR(locale, "Annual fee", "Jahresgebühr"),
  ];
  const body = countries.map((c) => [
    `${c.flagEmoji} ${c.countryName}`,
    `${c.timeline.typicalProcessingWeeks.min}–${c.timeline.typicalProcessingWeeks.max}`,
    c.timeline.applicationFee ?? "—",
    c.timeline.annualFee ?? "—",
  ]);
  return [header, ...body];
}

function euReadinessRows(
  countries: JurisdictionLaw[],
  locale: ComparatorLocale,
): string[][] {
  const header = [
    TR(locale, "Country", "Land"),
    TR(locale, "Relationship", "Verhältnis"),
    TR(locale, "Description", "Beschreibung"),
  ];
  const body = countries.map((c) => [
    `${c.flagEmoji} ${c.countryName}`,
    c.euSpaceActCrossRef.relationship,
    /* Description is the longest cell — Word's auto-fit handles up to
       ~80 chars per cell before line-wrapping breaks the table grid. */
    c.euSpaceActCrossRef.description.slice(0, 200) +
      (c.euSpaceActCrossRef.description.length > 200 ? "…" : ""),
  ]);
  return [header, ...body];
}

const DIMENSION_BUILDERS: Record<
  Exclude<ComparatorDimension, "all">,
  (countries: JurisdictionLaw[], locale: ComparatorLocale) => string[][]
> = {
  authorization: authorizationRows,
  liability: liabilityRows,
  debris: debrisRows,
  registration: registrationRows,
  timeline: timelineRows,
  eu_readiness: euReadinessRows,
};

/* ── Markdown table renderer ────────────────────────────────────────
 * Standard GFM table syntax — `markdownToWordHtml` in draft-export
 * already understands the `| h1 | h2 |` + separator-row + body
 * shape (it's HTML-table-converted by Word's import on .doc open).
 *
 * Cells are escaped for pipes + newlines so a multi-line cell value
 * doesn't blow the row apart. */

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

function renderMarkdownTable(rows: string[][]): string {
  if (rows.length === 0) return "";
  const [header, ...body] = rows;
  const headerLine = `| ${header.map(escapeCell).join(" | ")} |`;
  const separatorLine = `| ${header.map(() => "---").join(" | ")} |`;
  const bodyLines = body.map((r) => `| ${r.map(escapeCell).join(" | ")} |`);
  return [headerLine, separatorLine, ...bodyLines].join("\n");
}

export interface BuildComparisonMarkdownArgs {
  countries: JurisdictionLaw[];
  dimension: ComparatorDimension;
  locale: ComparatorLocale;
}

/**
 * Public entry point. Given a list of `JurisdictionLaw` records and a
 * dimension selection, returns the full markdown body the partner
 * sees inside Word. Includes a title heading, source-attribution
 * paragraph, one or more tables, and a footer note that the
 * exportDraftAsWord disclaimer back-stop will then prepend its
 * legal-review disclaimer to.
 */
export function buildComparisonMarkdown(args: BuildComparisonMarkdownArgs): {
  markdown: string;
  title: string;
} {
  const { countries, dimension, locale } = args;
  const codes = countries.map((c) => c.countryCode).join(", ");
  const title = TR(
    locale,
    `Atlas comparator: ${codes} — ${DIMENSION_TITLE[dimension].en}`,
    `Atlas-Vergleich: ${codes} — ${DIMENSION_TITLE[dimension].de}`,
  );

  const intro = TR(
    locale,
    `Side-by-side comparison of ${countries.length} jurisdictions across ` +
      `${DIMENSION_TITLE[dimension].en.toLowerCase()}. Data is drawn from ` +
      `Caelex Atlas's curated national space-law database. Each row is ` +
      `sourced from primary national gazettes or equivalent official ` +
      `registers and cross-referenced against the UN depositary of space treaties.`,
    `Vergleich von ${countries.length} Jurisdiktionen entlang ` +
      `${DIMENSION_TITLE[dimension].de.toLowerCase()}. Datenbasis: Caelex ` +
      `Atlas-Datenbank des nationalen Weltraumrechts. Jede Zeile stammt aus ` +
      `nationalen Gesetzblättern oder gleichwertigen amtlichen Registern und ` +
      `wurde mit dem UN-Depositar der Weltraumverträge abgeglichen.`,
  );

  /* "all" expands to every dimension as a sub-section. Otherwise we
     emit just the chosen one. */
  const dimensionsToRender: Exclude<ComparatorDimension, "all">[] =
    dimension === "all"
      ? (Object.keys(DIMENSION_BUILDERS) as Exclude<
          ComparatorDimension,
          "all"
        >[])
      : [dimension];

  const sections = dimensionsToRender
    .map((dim) => {
      const heading = TR(
        locale,
        `## ${DIMENSION_TITLE[dim].en}`,
        `## ${DIMENSION_TITLE[dim].de}`,
      );
      const table = renderMarkdownTable(
        DIMENSION_BUILDERS[dim](countries, locale),
      );
      return `${heading}\n\n${table}`;
    })
    .join("\n\n");

  const footer = TR(
    locale,
    `\n\n---\n\n*Generated by Caelex Atlas Comparator. Verify against the ` +
      `official text of each instrument before relying on this comparison ` +
      `for client advice.*`,
    `\n\n---\n\n*Erstellt mit dem Caelex Atlas-Vergleich. Vor Verwendung in ` +
      `der Mandantenberatung am offiziellen Wortlaut der jeweiligen Norm ` +
      `verifizieren.*`,
  );

  const markdown = `# ${title}\n\n${intro}\n\n${sections}${footer}`;
  return { markdown, title };
}
