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
 * Per-type bands (treaty parties / directive transposition / …) and the
 * cross-reference block are deliberately OUT of scope here — a later phase.
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

import { ScholarPage } from "../../_components/ScholarPage";
import { SCHOLAR_TYPE } from "../../_components/scholar-type";
import { BackLink } from "../../_components/BackLink";
import { Eyebrow } from "../../_components/Eyebrow";
import { MetadataStrip } from "../../_components/MetadataStrip";
import { InDocTOC } from "../../_components/InDocTOC";
import { ProvisionCard } from "../../_components/ProvisionCard";

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
                    items={provisions.map((p) => ({
                      id: p.anchorId,
                      label: p.tocLabel,
                    }))}
                  />
                </div>
              </details>

              <ul className="space-y-8" role="list">
                {provisions.map((p) => (
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
            </section>

            {/* Right rail — sticky in-document TOC (lg+ only). */}
            <aside className="hidden lg:order-2 lg:block">
              <div className="sticky top-20">
                <InDocTOC
                  items={provisions.map((p) => ({
                    id: p.anchorId,
                    label: p.tocLabel,
                  }))}
                />
              </div>
            </aside>
          </div>
        ) : null}

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
