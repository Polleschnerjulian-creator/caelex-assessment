/**
 * /scholar/jurisdictions/[code] — Legal landscape for one jurisdiction.
 *
 * Server Component — corpus read server-side; nothing reaches the bundle.
 * Next.js 15: params is a Promise — await it.
 *
 * Concept §4 "Jurisdiction detail": surfaces the three previously-unused
 * data-layer helpers so a jurisdiction reads as a real legal landscape, not
 * just a flat source list:
 *   • "Zuständige Behörden" — getAuthoritiesByJurisdiction (name + role + site)
 *   • "Nationales Recht"    — getNationalSources
 *   • "Anwendbares Völkerrecht / EU-Recht" — getApplicableInternationalSources
 * Both source groups render through the shared monochrome SourceRow, each row
 * linking to /scholar/sources/{id}.
 *
 * Language honesty (concept §3 / §4): titles & authority names follow the
 * user's `sourceLanguage` preference, resolved exactly the way
 * source-detail.server.ts does (original → title_local ?? title_en; otherwise
 * the Atlas translation registry via getTranslatedSource / …Authority). The
 * previous version force-rendered `title_en`, ignoring the pref — fixed here.
 *
 * STRICTLY MONOCHROME: black / white / gray-* only — zero other hues anywhere.
 * Every type size comes from the shared SCHOLAR_TYPE tokens / Eyebrow — never
 * an ad-hoc text-[Npx].
 *
 * WCAG 2.2 AA:
 *   - <main> landmark + lang="de" via ScholarPage; <h1> via PageHeader.
 *   - Heading hierarchy h1 (jurisdiction) → h2 (Behörden / Nationales Recht /
 *     Völkerrecht). Each section is aria-labelledby its h2.
 *   - Source rows via shared SourceRow (focus ring, gray-900/600 on white).
 *   - Authority website links: gray-700→gray-900, focus-visible ring, ≥24px
 *     target (py-1), motion gated behind motion-safe:.
 *   - Context-aware back link via shared BackLink (text-small token, ≥24px).
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { notFound } from "next/navigation";
import { Building2, ExternalLink, Globe2, Scale } from "lucide-react";

import { auth } from "@/lib/auth";
import { getScholarPreferences } from "@/lib/scholar/preferences.server";
import {
  getApplicableInternationalSources,
  getAuthoritiesByJurisdiction,
  getAvailableJurisdictions,
  getNationalSources,
  getTranslatedAuthority,
  getTranslatedSource,
} from "@/data/legal-sources";
import type { Authority, NormalizedLegalSource } from "@/data/legal-sources";
import { getCountryName } from "@/data/iso-3166-countries";

import { ScholarPage } from "../../_components/ScholarPage";
import { PageHeader } from "../../_components/PageHeader";
import { BackLink } from "../../_components/BackLink";
import { Eyebrow } from "../../_components/Eyebrow";
import { SCHOLAR_TYPE } from "../../_components/scholar-type";
import { SourceRow } from "../../_components/SourceRow";
import type { SourceRowData } from "../../_components/SourceRow";

// Special jurisdiction display names not in ISO-3166
const SPECIAL_NAMES: Record<string, string> = {
  INT: "International",
  EU: "European Union",
};

function getJurisdictionLabel(code: string): string {
  return SPECIAL_NAMES[code] ?? getCountryName(code);
}

// ─── Language-pref resolvers (mirror source-detail.server.ts) ──────────
// "original" / falsy → no translation: use the local title (then English).
// Any real language code → resolve via the Atlas translation registry, which
// falls back gracefully on its own. Keeps this page consistent with how the
// source-detail reading shell resolves the same preference.
function resolveSourceTitle(
  source: NormalizedLegalSource,
  language: string,
): string {
  if (language === "original" || !language) {
    return source.title_local ?? source.title_en;
  }
  return getTranslatedSource(source, language).title;
}

function resolveAuthorityName(authority: Authority, language: string): string {
  if (language === "original" || !language) {
    return authority.name_local ?? authority.name_en;
  }
  return getTranslatedAuthority(authority, language).name;
}

// Authority role line: prefer the structured space_mandate, falling back to the
// free-text role_description used by newer jurisdiction files. Under a chosen
// language the translation registry resolves the mandate; role_description is
// the last resort. Returns undefined when neither exists (the line is skipped).
function resolveAuthorityRole(
  authority: Authority,
  language: string,
): string | undefined {
  if (language === "original" || !language) {
    return authority.space_mandate ?? authority.role_description ?? undefined;
  }
  return (
    getTranslatedAuthority(authority, language).mandate ||
    authority.role_description ||
    undefined
  );
}

// Map a corpus source to the shared SourceRow shape, resolving the title to the
// user's preferred language. Everything else is a verbatim pass-through.
function toRowData(
  source: NormalizedLegalSource,
  language: string,
): SourceRowData {
  return {
    id: source.id,
    jurisdiction: source.jurisdiction,
    type: source.type,
    status: source.status,
    title: resolveSourceTitle(source, language),
    officialReference: source.official_reference ?? null,
    relevanceLevel: source.relevance_level ?? null,
    scopeDescription: source.scope_description ?? null,
  };
}

// ─── Shared source-list section (national + international share this) ───
// Renders nothing when the group is empty so an empty band never appears.
function SourceListSection({
  id,
  heading,
  icon: Icon,
  sources,
  language,
}: {
  id: string;
  heading: string;
  icon: typeof Scale;
  sources: NormalizedLegalSource[];
  language: string;
}) {
  if (sources.length === 0) return null;
  return (
    <section aria-labelledby={`${id}-heading`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon
          size={13}
          className="text-gray-500"
          strokeWidth={1.5}
          aria-hidden={true}
        />
        {/* WCAG 1.3.1: h2 for section heading */}
        <h2 id={`${id}-heading`} className={SCHOLAR_TYPE.sectionHeading}>
          {heading}
        </h2>
      </div>

      {/* WCAG 1.3.1: list semantics for result items */}
      <ul className="space-y-1" role="list">
        {sources.map((source) => (
          <li key={source.id}>
            <SourceRow source={toRowData(source, language)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

interface Props {
  params: Promise<{ code: string }>;
}

export default async function JurisdictionDetailPage({ params }: Props) {
  // Next.js 15: params is a Promise
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  // Validate that this code is in our corpus
  const validCodes = getAvailableJurisdictions();
  if (!validCodes.includes(code)) {
    notFound();
  }

  // Read the user's sourceLanguage preference server-side (mirror
  // sources/[id]); default "original" when unauthenticated.
  const session = await auth();
  const prefs = session?.user?.id
    ? await getScholarPreferences(session.user.id)
    : null;
  const sourceLanguage = prefs?.sourceLanguage ?? "original";

  // Split the corpus the way concept §4 asks: national law vs. the
  // international / EU instruments that apply here. For INT/EU jurisdictions
  // the "applicable international" set is empty by construction, so that
  // section simply doesn't render.
  const nationalSources = getNationalSources(code);
  const internationalSources = getApplicableInternationalSources(code);
  const authorities = getAuthoritiesByJurisdiction(code);

  // Keep the original "this jurisdiction has content" guard, now over the
  // combined set (a jurisdiction with only applicable international sources
  // still has a page).
  const totalSources = nationalSources.length + internationalSources.length;
  if (totalSources === 0 && authorities.length === 0) {
    notFound();
  }

  const label = getJurisdictionLabel(code);

  return (
    <ScholarPage>
      {/* Context-aware back link (shared primitive — text-small token, ≥24px). */}
      <BackLink
        fallbackHref="/scholar/jurisdictions"
        fallbackLabel="Zurück zu Jurisdiktionen"
        className="mb-6"
      />

      <PageHeader
        eyebrow={code}
        title={label}
        subtitle={`${totalSources} ${totalSources === 1 ? "Rechtsquelle" : "Rechtsquellen"}`}
      />

      <div className="space-y-10">
        {/* ─── Zuständige Behörden ─────────────────────────────────── */}
        {authorities.length > 0 && (
          <section aria-labelledby="authorities-heading">
            <div className="mb-2 flex items-center gap-2">
              <Building2
                size={13}
                className="text-gray-500"
                strokeWidth={1.5}
                aria-hidden={true}
              />
              {/* WCAG 1.3.1: h2 for section heading */}
              <h2
                id="authorities-heading"
                className={SCHOLAR_TYPE.sectionHeading}
              >
                Zuständige Behörden
              </h2>
            </div>

            <ul className="space-y-2" role="list">
              {authorities.map((authority) => {
                const name = resolveAuthorityName(authority, sourceLanguage);
                const role = resolveAuthorityRole(authority, sourceLanguage);
                return (
                  <li
                    key={authority.id}
                    className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className={SCHOLAR_TYPE.provisionLabel}>
                        {name}
                      </span>
                      {authority.abbreviation && (
                        <span className={SCHOLAR_TYPE.mono}>
                          {authority.abbreviation}
                        </span>
                      )}
                    </div>

                    {role && (
                      <p
                        className={`mt-1 max-w-[68ch] ${SCHOLAR_TYPE.bodyMuted}`}
                      >
                        {role}
                      </p>
                    )}

                    {authority.website && (
                      <a
                        href={authority.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 rounded py-1 text-small text-gray-700 hover:text-gray-900 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
                      >
                        <ExternalLink size={13} aria-hidden={true} />
                        Website ansehen →
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ─── Nationales Recht ────────────────────────────────────── */}
        <SourceListSection
          id="national"
          heading="Nationales Recht"
          icon={Scale}
          sources={nationalSources}
          language={sourceLanguage}
        />

        {/* ─── Anwendbares Völkerrecht / EU-Recht ──────────────────── */}
        <SourceListSection
          id="international"
          heading="Anwendbares Völkerrecht / EU-Recht"
          icon={Globe2}
          sources={internationalSources}
          language={sourceLanguage}
        />
      </div>

      {/* Footer */}
      <footer className="mt-20 border-t border-gray-200 pt-8 pb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eyebrow>Scholar</Eyebrow>
            <span className={SCHOLAR_TYPE.meta}>by Caelex</span>
          </div>
          <span className={SCHOLAR_TYPE.meta}>
            © {new Date().getFullYear()} Caelex
          </span>
        </div>
      </footer>
    </ScholarPage>
  );
}
