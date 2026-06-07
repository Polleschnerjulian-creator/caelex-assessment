/**
 * Caelex Scholar — case-law detail page = the shared "reading shell" (concept §3f).
 *
 * Server Component: reads the case + applied legal sources directly from the
 * corpus (no client fetch, no spinner). notFound() replaces client 404 states.
 * Next.js 15: params is a Promise — await it. Kept force-dynamic / nodejs so the
 * per-user sourceLanguage preference is read fresh server-side (no caching of a
 * user-specific projection), exactly like sources/[id].
 *
 * Composes the Phase-1 reading primitives into the case shell:
 *   context-aware BackLink → sticky doc-title bar → header card (forum eyebrow +
 *   h1 caption + "Kläger gegen Beklagter" + MetadataStrip + official-decision
 *   link + CopyCitation + translation-provenance note) → two-column body
 *   (anchored section cards + right-rail InDocTOC) → "Beteiligte" chips →
 *   "Angewandte Rechtsquellen" links → footer (last-verified + disclaimer).
 *
 * Sections render INLINE (no new shared component) per the assignment — the
 * primitives are reused, not reinvented.
 *
 * STRICTLY MONOCHROME: black / white / gray-* only — zero other hues anywhere.
 * Every reading size comes from the shared SCHOLAR_TYPE tokens — no text-[Npx].
 *
 * Translation (concept §3f): case bodies follow the user's sourceLanguage pref
 * via getTranslatedCase (DE coverage exists; FR sparser; "original"/"en" and any
 * missing entry fall back to the English source fields). The "Caelex-Übersetzung"
 * provenance note appears only when a translation record was actually applied.
 *
 * WCAG 2.2 AA:
 *   - lang="de" on ScholarPage (3.1.1 — content is German).
 *   - Heading hierarchy h1 (case caption) → h2 (sections).
 *   - Primary gray-900 / secondary gray-700 / tertiary gray-600 all clear AA.
 *   - focus-visible:ring-2 ring-gray-900 ring-offset-2 on every interactive el;
 *     external links carry a directional arrow + rel="noopener noreferrer".
 *   - Targets ≥24px (py-1 links, py-2.5 source rows); motion gated motion-safe:.
 *   - Section anchors deep-linkable (id + scroll-mt-24 + global [id] rule).
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { auth } from "@/lib/auth";
import { getCaseById, getTranslatedCase } from "@/data/legal-cases";
import { getLegalSourceById } from "@/data/legal-sources";
import { getScholarPreferences } from "@/lib/scholar/preferences.server";
import {
  isBookmarked,
  getReadingLists,
} from "@/lib/scholar/saved-items.server";

import { ScholarPage } from "../../_components/ScholarPage";
import { SCHOLAR_TYPE } from "../../_components/scholar-type";
import { BackLink } from "../../_components/BackLink";
import { Eyebrow } from "../../_components/Eyebrow";
import { MetadataStrip } from "../../_components/MetadataStrip";
import { InDocTOC } from "../../_components/InDocTOC";
import { CopyCitation } from "../../_components/CopyCitation";
import { BookmarkButton } from "../../_components/BookmarkButton";
import { AddToListMenu } from "../../_components/AddToListMenu";

interface Props {
  params: Promise<{ id: string }>;
}

// ─── Precedential-weight → German label ────────────────────────────────
// The weight enum is NOT translated by getTranslatedCase (it stays on the
// source record), so it is localised here for the metadata strip.
const WEIGHT_LABELS: Record<string, string> = {
  binding: "Bindend",
  persuasive: "Überzeugend",
  settled_facts: "Vergleichspraxis",
  non_precedential: "Keine Präzedenzwirkung",
  treaty_only: "Völkerrechtlich",
};

function weightLabel(raw: string): string {
  return WEIGHT_LABELS[raw] ?? raw.replace(/_/g, " ").trim();
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

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;

  const c = getCaseById(id);
  if (!c) notFound();

  // ─── Resolve the user's sourceLanguage preference (server-side) ───────
  // Mirrors sources/[id]: default "original" when unauthenticated (the layout
  // redirects anyway, but stay safe).
  const session = await auth();
  const prefs = session?.user?.id
    ? await getScholarPreferences(session.user.id)
    : null;
  const sourceLanguage = prefs?.sourceLanguage ?? "original";

  // Per-user saved-state for the header action row (Merkliste + Leselisten).
  // Guarded on the session: unauthenticated readers get defaults (the layout
  // redirects anyway). The two reads are independent → fetch them in parallel.
  const userId = session?.user?.id ?? null;
  const [initialBookmarked, readingLists] = userId
    ? await Promise.all([
        isBookmarked(userId, "case", c.id),
        getReadingLists(userId),
      ])
    : [false, []];

  // ─── Wire getTranslatedCase ──────────────────────────────────────────
  // "original" and "en" both mean "show the English source-of-truth fields".
  // For "de"/"fr" we look up a translation record; getTranslatedCase returns
  // undefined for unsupported langs OR cases with no entry → EN fallback.
  const translation =
    sourceLanguage !== "original" && sourceLanguage !== "en"
      ? getTranslatedCase(c.id, sourceLanguage)
      : undefined;

  // A translation was genuinely applied iff a record came back. The provenance
  // note is keyed off this (NOT merely "pref != original"), so EN-fallback
  // cases never falsely claim a translated wording.
  const isTranslated = translation !== undefined;

  // Per-field resolution: translated value when present, else the English
  // source field. Only the fields getTranslatedCase covers are switchable —
  // precedential_weight / citation / dates / remedy amounts / parties stay
  // on the source record (never translated upstream).
  const view = {
    title: translation?.title ?? c.title,
    forumName: translation?.forum_name ?? c.forum_name,
    plaintiff: translation?.plaintiff ?? c.plaintiff,
    defendant: translation?.defendant ?? c.defendant,
    facts: translation?.facts ?? c.facts,
    rulingSummary: translation?.ruling_summary ?? c.ruling_summary,
    legalHolding: translation?.legal_holding ?? c.legal_holding,
    industrySignificance:
      translation?.industry_significance ?? c.industry_significance,
    remedyNonMonetary:
      translation?.remedy_non_monetary ?? c.remedy?.non_monetary,
    notes: translation?.notes ?? c.notes,
  };

  // ─── Applied sources for the "Angewandte Rechtsquellen" block ─────────
  const appliedSources = c.applied_sources
    .map((sid) => getLegalSourceById(sid))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  // ─── Derived display values ──────────────────────────────────────────
  const dateDecided = formatDate(c.date_decided);
  const dateFiled = formatDate(c.date_filed);
  const lastVerified = formatDate(c.last_verified);

  // Canonical citation for the copy button — prefer the formal citation, fall
  // back to the case caption so the button always has a meaningful string.
  const citationText = c.citation ?? view.title;

  // ─── Section model — anchor ids drive both the cards and the TOC ──────
  // Only sections with content are listed (Rechtsfolge / Hinweise are optional).
  const hasRemedy =
    !!c.remedy &&
    ((c.remedy.monetary && c.remedy.amount_usd != null) ||
      (view.remedyNonMonetary != null && view.remedyNonMonetary.length > 0));
  const hasNotes = !!view.notes && view.notes.length > 0;

  const tocItems: { id: string; label: string }[] = [
    { id: "facts", label: "Sachverhalt" },
    { id: "ruling", label: "Entscheidung" },
    { id: "holding", label: "Leitsatz" },
    { id: "significance", label: "Bedeutung" },
    ...(hasRemedy ? [{ id: "remedy", label: "Rechtsfolge" }] : []),
    ...(hasNotes ? [{ id: "notes", label: "Hinweise" }] : []),
  ];

  return (
    <ScholarPage>
      {/* Context-aware back link — returns to wherever the reader came from. */}
      <BackLink fallbackHref="/scholar/cases" fallbackLabel="Zurück" />

      {/*
        Sticky doc-title bar — subtle "where am I" affordance (concept §2b:
        sticky doc-title in place of a breadcrumb trail). Purely supplementary
        to the h1 below, so it is aria-hidden to avoid a duplicate-title
        announcement for screen readers.
      */}
      <div
        aria-hidden="true"
        className="sticky top-0 z-10 -mx-6 mb-6 border-b border-gray-200 bg-[#F7F8FA]/80 px-6 py-2 backdrop-blur lg:-mx-8 lg:px-8"
      >
        <p className="truncate text-small text-gray-600">{view.title}</p>
      </div>

      <div className="space-y-8">
        {/* ─── Header card ─────────────────────────────────────────── */}
        <header className="rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <Eyebrow>{view.forumName}</Eyebrow>
            {/*
              WCAG 1.3.1 / 2.4.6: the case caption is the page's h1 — the first
              visible heading on the content area.
            */}
            <h1 className={SCHOLAR_TYPE.docTitle}>{view.title}</h1>
            {/* Parties line — "Kläger gegen Beklagter". */}
            <p className={SCHOLAR_TYPE.bodyMuted}>
              {view.plaintiff} <span className="text-gray-500">gegen</span>{" "}
              {view.defendant}
            </p>
          </div>

          {/*
            Metadata strip — status leads as the pill; the rest are quiet
            key:value pairs. Empty values (no date_filed / case_number /
            citation) are skipped by MetadataStrip automatically.
          */}
          <MetadataStrip
            status={c.status}
            items={[
              {
                label: "Präzedenzgewicht",
                value: weightLabel(c.precedential_weight),
              },
              { label: "Forum", value: view.forumName },
              { label: "Jurisdiktion", value: c.jurisdiction },
              { label: "Entschieden", value: dateDecided },
              { label: "Eingereicht", value: dateFiled },
              { label: "Aktenzeichen", value: c.case_number, mono: true },
              { label: "Zitierung", value: c.citation, mono: true },
            ]}
          />

          {/* Official decision link + copy-citation + translation provenance. */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-gray-200 pt-4">
            {c.source_url && (
              <a
                href={c.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded py-1 text-small text-gray-700 hover:text-gray-900 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
              >
                <ExternalLink size={13} aria-hidden="true" />
                Amtliche Entscheidung ansehen →
              </a>
            )}
            <CopyCitation text={citationText} label="Zitierung kopieren" />
            <BookmarkButton
              itemType="case"
              itemId={c.id}
              initialBookmarked={initialBookmarked}
            />
            <AddToListMenu itemType="case" itemId={c.id} lists={readingLists} />
          </div>

          {isTranslated && (
            <p className="text-small text-gray-600">
              Caelex-Übersetzung — nicht der amtliche Wortlaut
            </p>
          )}
        </header>

        {/* ─── Body: section column + right rail (TOC) on lg ─────────── */}
        <div className="lg:grid lg:grid-cols-[1fr_15rem] lg:gap-10">
          {/* Section column */}
          <div className="space-y-8 lg:order-1">
            {/*
              On < lg the right rail is hidden, so render the TOC inline above
              the sections as a disclosure (collapsed by default to keep the
              reading column uncluttered).
            */}
            <details className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm lg:hidden">
              <summary className="cursor-pointer rounded text-small font-medium text-gray-700 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]">
                Inhalt
              </summary>
              <div className="mt-3">
                <InDocTOC items={tocItems} />
              </div>
            </details>

            {/* Sachverhalt (facts) */}
            <section
              id="facts"
              aria-labelledby="facts-heading"
              className="scroll-mt-24 rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm space-y-3"
            >
              <h2 id="facts-heading" className={SCHOLAR_TYPE.sectionHeading}>
                Sachverhalt
              </h2>
              <p
                className={`max-w-[68ch] whitespace-pre-line ${SCHOLAR_TYPE.body}`}
              >
                {view.facts}
              </p>
            </section>

            {/* Entscheidung (ruling summary) */}
            <section
              id="ruling"
              aria-labelledby="ruling-heading"
              className="scroll-mt-24 rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm space-y-3"
            >
              <h2 id="ruling-heading" className={SCHOLAR_TYPE.sectionHeading}>
                Entscheidung
              </h2>
              <p
                className={`max-w-[68ch] whitespace-pre-line ${SCHOLAR_TYPE.body}`}
              >
                {view.rulingSummary}
              </p>
            </section>

            {/* Leitsatz (legal holding) */}
            <section
              id="holding"
              aria-labelledby="holding-heading"
              className="scroll-mt-24 rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm space-y-3"
            >
              <h2 id="holding-heading" className={SCHOLAR_TYPE.sectionHeading}>
                Leitsatz
              </h2>
              <p className={`max-w-[68ch] ${SCHOLAR_TYPE.body}`}>
                {view.legalHolding}
              </p>
            </section>

            {/* Bedeutung (industry significance) */}
            <section
              id="significance"
              aria-labelledby="significance-heading"
              className="scroll-mt-24 rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm space-y-3"
            >
              <h2
                id="significance-heading"
                className={SCHOLAR_TYPE.sectionHeading}
              >
                Bedeutung
              </h2>
              <p className={`max-w-[68ch] ${SCHOLAR_TYPE.body}`}>
                {view.industrySignificance}
              </p>
            </section>

            {/* Rechtsfolge (remedy) — only when present */}
            {hasRemedy && (
              <section
                id="remedy"
                aria-labelledby="remedy-heading"
                className="scroll-mt-24 rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm space-y-3"
              >
                <h2 id="remedy-heading" className={SCHOLAR_TYPE.sectionHeading}>
                  Rechtsfolge
                </h2>
                {c.remedy?.monetary && c.remedy.amount_usd != null && (
                  <p className={`max-w-[68ch] ${SCHOLAR_TYPE.body}`}>
                    Geldbuße:{" "}
                    <span className="font-semibold">
                      {c.remedy.amount_local
                        ? `${c.remedy.amount_local.currency} ${c.remedy.amount_local.amount.toLocaleString("de-DE")}`
                        : `USD ${c.remedy.amount_usd.toLocaleString("de-DE")}`}
                    </span>
                  </p>
                )}
                {view.remedyNonMonetary &&
                  view.remedyNonMonetary.length > 0 && (
                    <ul
                      className="max-w-[68ch] list-disc space-y-1 pl-5"
                      role="list"
                    >
                      {view.remedyNonMonetary.map((item, i) => (
                        <li key={i} className={SCHOLAR_TYPE.body}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
              </section>
            )}

            {/* Hinweise (notes) — only when present */}
            {hasNotes && (
              <section
                id="notes"
                aria-labelledby="notes-heading"
                className="scroll-mt-24 rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm space-y-3"
              >
                <h2 id="notes-heading" className={SCHOLAR_TYPE.sectionHeading}>
                  Hinweise
                </h2>
                <ul
                  className="max-w-[68ch] list-disc space-y-2 pl-5"
                  role="list"
                >
                  {view.notes!.map((note, i) => (
                    <li key={i} className={SCHOLAR_TYPE.bodyMuted}>
                      {note}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Beteiligte — monochrome party chips (concept §3f). */}
            {c.parties_mentioned && c.parties_mentioned.length > 0 && (
              <section
                aria-labelledby="parties-heading"
                className="rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm space-y-3"
              >
                <h2
                  id="parties-heading"
                  className={SCHOLAR_TYPE.sectionHeading}
                >
                  Beteiligte
                </h2>
                <ul className="flex flex-wrap gap-2" role="list">
                  {c.parties_mentioned.map((party, i) => (
                    <li
                      key={i}
                      className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-small text-gray-700"
                    >
                      {party}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Angewandte Rechtsquellen → source pages. */}
            {appliedSources.length > 0 && (
              <section
                aria-labelledby="sources-heading"
                className="rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm space-y-3"
              >
                <h2
                  id="sources-heading"
                  className={SCHOLAR_TYPE.sectionHeading}
                >
                  Angewandte Rechtsquellen
                </h2>
                <ul className="space-y-1" role="list">
                  {appliedSources.map((source) => (
                    <li key={source.id}>
                      {/*
                        WCAG 2.5.8: py-2.5 around a 14px line clears ≥24px ✓
                        WCAG 2.4.7: focus-visible ring ✓
                      */}
                      <Link
                        href={`/scholar/sources/${encodeURIComponent(source.id)}`}
                        className="group flex items-center gap-3 rounded-xl border border-transparent px-4 py-2.5 hover:border-gray-200 hover:bg-gray-50 motion-safe:transition-all motion-safe:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      >
                        <span className="w-8 flex-shrink-0 text-micro font-bold uppercase tracking-[0.08em] text-gray-600">
                          {source.jurisdiction}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-body-lg text-gray-700 group-hover:text-gray-900 motion-safe:transition-colors">
                          {source.title_en}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Right rail — sticky in-document TOC (lg+ only). */}
          <aside className="hidden lg:order-2 lg:block">
            <div className="sticky top-20">
              <InDocTOC items={tocItems} />
            </div>
          </aside>
        </div>

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
