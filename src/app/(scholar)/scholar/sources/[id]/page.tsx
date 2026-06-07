/**
 * Caelex Scholar — source-detail page = the shared "reading shell" (concept §3).
 *
 * Server Component: reads corpus data directly via getScholarSourceDetail (no
 * client fetch, no spinner). notFound() replaces client-side 404/error states.
 *
 * This composes the just-built reading primitives into the one document shell
 * every source type uses (concept §3 "Shared document shell"):
 *   context-aware back link → sticky doc-title bar → header card (eyebrow + h1 +
 *   local title) → MetadataStrip (status + key:value facts) → scope prose →
 *   official-source link → translation provenance note → two-column body
 *   (provisions + right-rail InDocTOC) → Schlüsselbestimmungen (ProvisionCard
 *   list) → footer (last-verified + disclaimer).
 *
 * Per-type identity bands (concept §3a–§3d) sit between the header card and
 * "Schlüsselbestimmungen", each rendered ONLY when its data exists (graceful —
 * never an empty band): treaty "Vertragsparteien" + "Nur unterzeichnet";
 * EU-regulation "Unmittelbar geltend" note; EU-directive transposition note +
 * "Gilt für Mitgliedstaaten". Preamble/recital provisions collapse into a
 * <details> below the substantive articles. National laws add nothing beyond
 * the shell (authorities already render in the MetadataStrip).
 *
 * The cross-reference graph (concept §2d) renders after "Schlüsselbestimmungen"
 * via <CrossRefBlock>: "Verwandte Quellen" (related sources + legal-basis chain,
 * resolved in source-detail.server.ts) and the reverse "Fälle, die diese Quelle
 * anwenden" lookup. The block is self-gating — it returns null when neither
 * list has entries, so a source with no graph shows nothing extra.
 *
 * STRICTLY MONOCHROME: black / white / gray-* only — zero other hues anywhere.
 * Every reading size comes from the shared SCHOLAR_TYPE tokens — no text-[Npx].
 *
 * WCAG 2.2 AA:
 *   - lang="de" on ScholarPage (WCAG 3.1.1 — content is German).
 *   - Heading hierarchy h1 (doc title) → h2 (sections) → h3 (provisions).
 *   - Primary gray-900 / secondary gray-700 / tertiary gray-600 all clear AA.
 *   - focus-visible:ring-2 ring-gray-900 ring-offset-2 ring-offset-[#F7F8FA] on
 *     every interactive element; external links carry directional arrows.
 *   - Targets ≥24px (py-1 on links); motion gated behind motion-safe:.
 *   - Provision anchors deep-linkable (id + scroll-mt-24 + global [id] rule).
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { auth } from "@/lib/auth";
import { getScholarSourceDetail } from "@/lib/scholar/source-detail.server";
import { getScholarPreferences } from "@/lib/scholar/preferences.server";
// Server component → may read @/data directly (the client-only "API-only" rule
// does not apply here). getCountryName resolves ISO-alpha-2 → readable name and
// returns the code unchanged for anything it doesn't know, so a band never
// shows a blank entry.
import { getCountryName } from "@/data/iso-3166-countries";

import { ScholarPage } from "../../_components/ScholarPage";
import { SCHOLAR_TYPE } from "../../_components/scholar-type";
import { BackLink } from "../../_components/BackLink";
import { Eyebrow } from "../../_components/Eyebrow";
import { MetadataStrip } from "../../_components/MetadataStrip";
import { InDocTOC } from "../../_components/InDocTOC";
import { ProvisionCard } from "../../_components/ProvisionCard";
import { CrossRefBlock } from "../../_components/CrossRefBlock";

interface PageProps {
  params: Promise<{ id: string }>;
}

// ─── Source type → human German eyebrow label ──────────────────────────
// Covers the populated corpus types; anything unmapped is humanised so the
// eyebrow never shows a raw snake_case enum.
const TYPE_LABELS: Record<string, string> = {
  international_treaty: "TREATY",
  eu_regulation: "EU-VERORDNUNG",
  eu_directive: "EU-RICHTLINIE",
  federal_law: "GESETZ",
  federal_regulation: "VERORDNUNG",
};

function typeLabel(type: string): string {
  const known = TYPE_LABELS[type];
  if (known) return known;
  // Humanise + uppercase an unmapped type: "draft_legislation" → "DRAFT LEGISLATION".
  return type.replace(/_/g, " ").trim().toUpperCase();
}

// ─── Stable provision slug ─────────────────────────────────────────────
// Builds a deep-link-safe id from the section (preferred) or title. The SAME
// id is handed to both the TOC item and its ProvisionCard so anchors line up.
// A trailing index guarantees uniqueness when two provisions slugify equally
// (or carry no section/title).
function slugifyProvision(raw: string, index: number): string {
  const base = raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/[^a-z0-9]+/g, "-") // non-alnum → hyphen
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
  return base ? `prov-${base}-${index}` : `prov-${index}`;
}

// ─── German date formatting (de-DE, dd.mm.yyyy), tolerant of bad input ──
function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Recital / preamble detection (concept §3b/§3c, recital collapse) ────
// A provision is preamble-grade when EITHER its section or its title reads as a
// preamble / recital / Erwägungsgrund. These get collapsed by default so the
// substantive articles stay open; if nothing matches, the collapse is skipped
// entirely (graceful — never an empty <details>).
const PREAMBLE_RE = /präambel|preamble|recital|erwägung/i;
function isPreambleProvision(section?: string, title?: string): boolean {
  return PREAMBLE_RE.test(section ?? "") || PREAMBLE_RE.test(title ?? "");
}

// ─── Country-list band — labelled block of jurisdictions (concept §3a/§3c) ──
// Shared by the treaty "Vertragsparteien" / "Nur unterzeichnet" lists and the
// directive "Gilt für Mitgliedstaaten" list. Monochrome labelled block: an
// Eyebrow label over an inline wrap of country chips. Each chip resolves to a
// readable country name (code fallback). Renders nothing when the list is empty
// so a band never appears without data. Presentational — no hooks, no client.
function CountryListBand({ label, codes }: { label: string; codes: string[] }) {
  if (codes.length === 0) return null;
  return (
    <div className="space-y-2">
      <Eyebrow>{label}</Eyebrow>
      <ul className="flex flex-wrap gap-1.5" role="list">
        {codes.map((code) => (
          <li
            key={code}
            className="rounded border border-gray-200 bg-gray-100 px-2 py-0.5 text-small text-gray-700"
          >
            {getCountryName(code)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function ScholarSourceDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Read the user's sourceLanguage preference server-side; default "original"
  // when unauthenticated (the layout redirects anyway, but be safe).
  const session = await auth();
  const prefs = session?.user?.id
    ? await getScholarPreferences(session.user.id)
    : null;
  const sourceLanguage = prefs?.sourceLanguage ?? "original";

  const source = getScholarSourceDetail(id, sourceLanguage);
  if (!source) notFound();

  // ─── Derive the dates line: "Erlassen … · In Kraft … · Geändert …" ──
  // Only the date fields that exist are joined, so the line never shows an
  // empty milestone.
  const dateParts: string[] = [];
  const enacted = formatDate(source.dateEnacted);
  const inForce = formatDate(source.dateInForce);
  const amended = formatDate(source.dateLastAmended);
  if (enacted) dateParts.push(`Erlassen ${enacted}`);
  if (inForce) dateParts.push(`In Kraft ${inForce}`);
  if (amended) dateParts.push(`Geändert ${amended}`);
  const datesLine = dateParts.length > 0 ? dateParts.join(" · ") : null;

  // First populated identifier wins (official → parliamentary → un), rendered mono.
  const identifier =
    source.officialReference ??
    source.parliamentaryReference ??
    source.unReference;

  // Competent authorities → single comma-joined value (the strip renders one pair).
  const authorities =
    source.competentAuthorities && source.competentAuthorities.length > 0
      ? source.competentAuthorities.join(", ")
      : undefined;

  // Translation provenance: a translation was applied iff the user asked for a
  // non-original language (the projection then resolved a translated title/scope).
  const isTranslated = sourceLanguage !== "original";

  // Build provision id ⇄ TOC item pairs ONCE so the card and the TOC share ids.
  const provisions = source.keyProvisions.map((p, i) => {
    const label = p.section || p.title;
    return { ...p, anchorId: slugifyProvision(label, i), tocLabel: label };
  });

  // Recital collapse (concept §3b/§3c): split preamble/recital entries out from
  // the substantive articles. Substantive provisions stay expanded; preamble
  // entries are wrapped in a collapsed <details> below them. The TOC lists the
  // substantive provisions only — preamble is secondary, kept out of the rail.
  const substantiveProvisions = provisions.filter(
    (p) => !isPreambleProvision(p.section, p.title),
  );
  const preambleProvisions = provisions.filter((p) =>
    isPreambleProvision(p.section, p.title),
  );

  // ─── Per-type identity band data (concept §3a–§3d) ──────────────────
  // Each is gated on real data so a band never renders empty.
  const treatyParties = source.appliesToJurisdictions ?? [];
  const treatySignatories = source.signedByJurisdictions ?? [];
  const directiveMemberStates = source.appliesToJurisdictions ?? [];
  // Does this source warrant ANY type band? (drives the wrapper so the spacing
  // block is omitted entirely when there's nothing type-specific to show).
  const hasTreatyBand =
    source.type === "international_treaty" &&
    (treatyParties.length > 0 || treatySignatories.length > 0);
  const hasRegulationBand = source.appliesToType === "directly-applicable";
  const hasDirectiveBand = source.appliesToType === "needs-transposition";
  const hasTypeBand = hasTreatyBand || hasRegulationBand || hasDirectiveBand;

  const lastVerified = formatDate(source.lastVerified);

  return (
    <ScholarPage>
      {/* Context-aware back link — returns to wherever the reader came from. */}
      <BackLink fallbackHref="/scholar/library" fallbackLabel="Zurück" />

      {/*
        Sticky doc-title bar — subtle "where am I" affordance (concept §2b:
        sticky doc-title in place of a breadcrumb trail). Degrades gracefully:
        it is purely supplementary to the h1 below, so it is aria-hidden to
        avoid a duplicate-title announcement for screen readers.
      */}
      <div
        aria-hidden="true"
        className="sticky top-0 z-10 -mx-6 mb-6 border-b border-gray-200 bg-[#F7F8FA]/80 px-6 py-2 backdrop-blur lg:-mx-8 lg:px-8"
      >
        <p className="truncate text-small text-gray-600">{source.title}</p>
      </div>

      <div className="space-y-8">
        {/* ─── Header card ─────────────────────────────────────────── */}
        <header className="rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <Eyebrow>{typeLabel(source.type)}</Eyebrow>
            {/*
              WCAG 1.3.1 / 2.4.6: the document title is the page's h1 — the
              first visible heading on the content area.
            */}
            <h1 className={SCHOLAR_TYPE.docTitle}>{source.title}</h1>
            {source.titleLocal && source.titleLocal !== source.title && (
              <p className={`italic ${SCHOLAR_TYPE.bodyMuted}`}>
                {source.titleLocal}
              </p>
            )}
          </div>

          {/* Metadata strip — status leads as the pill; rest are key:value pairs. */}
          <MetadataStrip
            status={source.status}
            items={[
              { label: "Jurisdiktion", value: source.jurisdiction },
              { label: "Herausgeber", value: source.issuingBody },
              { label: "Kennung", value: identifier, mono: true },
              { label: "Daten", value: datesLine },
              { label: "Zuständige Behörden", value: authorities },
            ]}
          />

          {/* Scope as reading prose (constrained measure). */}
          {source.scopeDescription && (
            <p className={`max-w-[68ch] ${SCHOLAR_TYPE.body}`}>
              {source.scopeDescription}
            </p>
          )}

          {/* Official source + translation provenance note. */}
          {(source.sourceUrl || isTranslated) && (
            <div className="space-y-2 border-t border-gray-200 pt-4">
              {source.sourceUrl && (
                <a
                  href={source.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded py-1 text-small text-gray-700 hover:text-gray-900 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
                >
                  <ExternalLink size={13} aria-hidden="true" />
                  Amtliche Quelle ansehen →
                </a>
              )}
              {isTranslated && (
                <p className="text-small text-gray-600">
                  Caelex-Übersetzung — nicht der amtliche Wortlaut
                </p>
              )}
            </div>
          )}
        </header>

        {/*
          ─── Per-type identity band (concept §3a–§3d) ────────────────
          Rendered only when the source's type carries type-specific data, so
          each instrument "reads as itself". Bordered monochrome panel sitting
          between the header and the provisions. Omitted entirely (no empty
          shell) when nothing type-specific applies.
        */}
        {hasTypeBand && (
          <section
            aria-labelledby="type-band-heading"
            className="rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm space-y-4"
          >
            {/* sr-only label keeps the section programmatically named without
                adding a visible heading that would compete with the card h1. */}
            <h2 id="type-band-heading" className="sr-only">
              Einordnung nach Rechtsquellentyp
            </h2>

            {/* §3a — international treaty: parties + signatory-only sub-list. */}
            {hasTreatyBand && (
              <div className="space-y-4">
                <CountryListBand
                  label="Vertragsparteien"
                  codes={treatyParties}
                />
                <CountryListBand
                  label="Nur unterzeichnet"
                  codes={treatySignatories}
                />
              </div>
            )}

            {/* §3b — EU regulation: directly-applicable affordance note. */}
            {hasRegulationBand && (
              <div className="space-y-1">
                <Eyebrow>Rechtswirkung</Eyebrow>
                <p className={SCHOLAR_TYPE.body}>
                  <span className="font-semibold text-gray-900">
                    Unmittelbar geltend.
                  </span>{" "}
                  Eine EU-Verordnung gilt in allen Mitgliedstaaten direkt — ohne
                  Umsetzung in nationales Recht.
                </p>
              </div>
            )}

            {/* §3c — EU directive: transposition note + member-state list. */}
            {hasDirectiveBand && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Eyebrow>Rechtswirkung</Eyebrow>
                  <p className={SCHOLAR_TYPE.body}>
                    <span className="font-semibold text-gray-900">
                      Umsetzung in nationales Recht erforderlich.
                    </span>{" "}
                    Eine EU-Richtlinie bindet die Mitgliedstaaten hinsichtlich
                    des Ziels; die Form der Umsetzung bleibt ihnen überlassen.
                  </p>
                </div>
                <CountryListBand
                  label="Gilt für Mitgliedstaaten"
                  codes={directiveMemberStates}
                />
              </div>
            )}
          </section>
        )}

        {/* ─── Body: prose column + right rail (TOC) on lg ──────────── */}
        {provisions.length > 0 ? (
          <div className="lg:grid lg:grid-cols-[1fr_15rem] lg:gap-10">
            {/* Prose column */}
            <section
              aria-labelledby="provisions-heading"
              className="space-y-4 lg:order-1"
            >
              <h2 id="provisions-heading" className={SCHOLAR_TYPE.partHeading}>
                Schlüsselbestimmungen
              </h2>

              {/*
                On < lg the right rail is hidden, so render the TOC inline above
                the provisions as a simple disclosure (collapsed by default to
                keep the reading column uncluttered).
              */}
              <details className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm lg:hidden">
                <summary className="cursor-pointer rounded text-small font-medium text-gray-700 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]">
                  Inhalt
                </summary>
                <div className="mt-3">
                  <InDocTOC
                    items={substantiveProvisions.map((p) => ({
                      id: p.anchorId,
                      label: p.tocLabel,
                    }))}
                  />
                </div>
              </details>

              <ul className="space-y-8" role="list">
                {substantiveProvisions.map((p) => (
                  <ProvisionCard
                    key={p.anchorId}
                    id={p.anchorId}
                    section={p.section}
                    title={p.title}
                    summary={p.summary}
                    complianceImplication={p.complianceImplication}
                    paragraphText={p.paragraphText}
                    paragraphTruncated={p.paragraphTextTruncated}
                    paragraphUrl={p.paragraphUrl}
                    sourceUrl={source.sourceUrl}
                    citationBase={source.title}
                  />
                ))}
              </ul>

              {/*
                Recital / preamble collapse (concept §3b/§3c): preamble entries
                are wrapped in a <details> collapsed by default, so the
                substantive articles above stay open while the long
                Erwägungsgründe stay tucked away. Rendered only when such
                entries exist (graceful — skipped silently otherwise).
              */}
              {preambleProvisions.length > 0 && (
                <details className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm">
                  <summary className="cursor-pointer rounded text-small font-medium text-gray-700 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]">
                    Präambel / Erwägungsgründe
                  </summary>
                  <ul className="mt-4 space-y-8" role="list">
                    {preambleProvisions.map((p) => (
                      <ProvisionCard
                        key={p.anchorId}
                        id={p.anchorId}
                        section={p.section}
                        title={p.title}
                        summary={p.summary}
                        complianceImplication={p.complianceImplication}
                        paragraphText={p.paragraphText}
                        paragraphTruncated={p.paragraphTextTruncated}
                        paragraphUrl={p.paragraphUrl}
                        sourceUrl={source.sourceUrl}
                        citationBase={source.title}
                      />
                    ))}
                  </ul>
                </details>
              )}
            </section>

            {/* Right rail — sticky in-document TOC (lg+ only). */}
            <aside className="hidden lg:order-2 lg:block">
              <div className="sticky top-20">
                <InDocTOC
                  items={substantiveProvisions.map((p) => ({
                    id: p.anchorId,
                    label: p.tocLabel,
                  }))}
                />
              </div>
            </aside>
          </div>
        ) : null}

        {/*
          ─── Cross-reference graph (concept §2d) ─────────────────────
          "Verwandte Quellen" + "Fälle, die diese Quelle anwenden". The DTO
          attaches these only when non-empty; CrossRefBlock self-gates to null
          when both lists are empty, so a graph-less source shows nothing here.
        */}
        <CrossRefBlock
          related={source.resolvedRelatedSources ?? []}
          citingCases={source.citingCases ?? []}
        />

        {/* ─── Footer: last-verified + disclaimer ──────────────────── */}
        <footer className="space-y-1 border-t border-gray-200 pt-6">
          {lastVerified && (
            <p className="text-small text-gray-600">
              Zuletzt verifiziert {lastVerified}
            </p>
          )}
          <p className="text-small text-gray-600">
            Kein Rechtsrat. Caelex Scholar dient ausschließlich der Recherche —
            maßgeblich ist stets der amtliche Wortlaut.
          </p>
        </footer>
      </div>
    </ScholarPage>
  );
}
