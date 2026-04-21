"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Scale, Building2, Globe2 } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import {
  // Single source of truth — barrel aggregates every jurisdiction
  // (including INT, EU, NZ, US) so any new country or instrument
  // auto-surfaces in Atlas landing-page search without touching
  // this import list.
  ALL_SOURCES,
  ALL_AUTHORITIES,
  getTranslatedSource,
  getTranslatedAuthority,
} from "@/data/legal-sources";
import type { LegalSourceType, RelevanceLevel } from "@/data/legal-sources";
import {
  ALL_LANDING_RIGHTS_PROFILES,
  ALL_CASE_STUDIES,
  ALL_CONDUCT_CONDITIONS,
  type LandingRightsProfile,
  type CaseStudy,
  type ConductCondition,
} from "@/data/landing-rights";

// ─── Aggregated data ─────────────────────────────────────────────────

// ─── Search ranking ─────────────────────────────────────────────────
//
// Whole-word-aware scoring so 3–4 letter queries like "ISO", "FCC",
// "FAA", "OSHAA" don't drown in substring matches (auth/ISO/ation,
// supervISOr, provISO, etc.). Higher-tier matches always beat any
// number of lower-tier ones thanks to the wide score gaps.

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scoreMatch(title: string, haystack: string, token: string): number {
  const lowerTitle = title.toLowerCase();
  const wordRe = new RegExp(`\\b${escapeRegex(token)}\\b`, "i");
  const titleIdx = lowerTitle.indexOf(token);
  const titleWholeWord = wordRe.test(title);
  if (titleWholeWord && titleIdx === 0) return 1000;
  if (titleWholeWord) return 500;
  if (titleIdx !== -1) return 100 - Math.min(titleIdx, 100);
  if (wordRe.test(haystack)) return 50;
  const hIdx = haystack.indexOf(token);
  return hIdx >= 0 ? Math.max(0, 10 - Math.floor(hIdx / 10)) : -Infinity;
}

// ─── Style maps ─────────────────────────────────────────────────────

function getTypeLabels(
  t: (key: string) => string,
): Record<LegalSourceType, string> {
  return {
    international_treaty: t("atlas.type_treaty"),
    federal_law: t("atlas.type_law"),
    federal_regulation: t("atlas.type_regulation"),
    technical_standard: t("atlas.type_standard"),
    eu_regulation: t("atlas.type_eu_regulation"),
    eu_directive: t("atlas.type_eu_directive"),
    policy_document: t("atlas.type_policy"),
    draft_legislation: t("atlas.type_draft"),
  };
}

// M15: medium/low levels were bg-gray-300 / bg-gray-200 — both below
// WCAG 2.1 AA non-text contrast (~1.3–2.1:1) on white. Upgraded to
// bg-gray-500 / bg-gray-400 which sit at 4.6:1 / 3.5:1 respectively.
const RELEVANCE_DOT: Record<RelevanceLevel, string> = {
  fundamental: "bg-gray-900",
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-gray-500",
  low: "bg-gray-400",
};

// ─── Greeting ───────────────────────────────────────────────────────

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "atlas.greeting_evening";
  if (hour < 12) return "atlas.greeting_morning";
  if (hour < 17) return "atlas.greeting_afternoon";
  return "atlas.greeting_evening";
}

// ─── Debounce ───────────────────────────────────────────────────────

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Search ─────────────────────────────────────────────────────────

interface SearchResults {
  jurisdictions: Array<
    [string, typeof JURISDICTION_DATA extends Map<string, infer V> ? V : never]
  >;
  sources: LegalSource[];
  authorities: Authority[];
  landingRightsProfiles: LandingRightsProfile[];
  landingRightsCaseStudies: CaseStudy[];
  landingRightsConduct: ConductCondition[];
}

function performSearch(query: string): SearchResults | null {
  const q = query.toLowerCase().trim();
  if (!q || q.length < 2) return null;

  const jurisdictions = [...JURISDICTION_DATA.entries()].filter(
    ([code, data]) =>
      data.countryName.toLowerCase().includes(q) ||
      code.toLowerCase() === q ||
      data.legislation.name.toLowerCase().includes(q) ||
      data.licensingAuthority.name.toLowerCase().includes(q),
  );

  const scoredSources = ALL_SOURCES.map((s) => {
    const haystack =
      `${s.id} ${s.title_en} ${s.title_local ?? ""} ${s.official_reference ?? ""} ${s.compliance_areas.join(" ")} ${s.key_provisions.map((p) => `${p.title} ${p.summary}`).join(" ")}`.toLowerCase();
    return { source: s, score: scoreMatch(s.title_en, haystack, q) };
  })
    .filter(({ score }) => score > -Infinity)
    .sort((a, b) => b.score - a.score);
  const sources = scoredSources.map(({ source }) => source);

  const scoredAuthorities = ALL_AUTHORITIES.map((a) => {
    const haystack =
      `${a.id} ${a.name_en} ${a.name_local ?? ""} ${a.abbreviation ?? ""} ${a.space_mandate}`.toLowerCase();
    return { authority: a, score: scoreMatch(a.name_en, haystack, q) };
  })
    .filter(({ score }) => score > -Infinity)
    .sort((a, b) => b.score - a.score);
  const authorities = scoredAuthorities.map(({ authority }) => authority);

  const landingRightsProfiles = ALL_LANDING_RIGHTS_PROFILES.filter(
    (p) =>
      p.overview.summary.toLowerCase().includes(q) ||
      p.regulators.some(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.abbreviation.toLowerCase().includes(q),
      ) ||
      p.jurisdiction.toLowerCase() === q,
  );

  const landingRightsCaseStudies = ALL_CASE_STUDIES.filter(
    (cs) =>
      cs.title.toLowerCase().includes(q) ||
      cs.operator.toLowerCase().includes(q) ||
      cs.narrative.toLowerCase().includes(q),
  );

  const landingRightsConduct = ALL_CONDUCT_CONDITIONS.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.requirement.toLowerCase().includes(q),
  );

  if (
    jurisdictions.length === 0 &&
    sources.length === 0 &&
    authorities.length === 0 &&
    landingRightsProfiles.length === 0 &&
    landingRightsCaseStudies.length === 0 &&
    landingRightsConduct.length === 0
  ) {
    return null;
  }

  return {
    jurisdictions,
    sources,
    authorities,
    landingRightsProfiles,
    landingRightsCaseStudies,
    landingRightsConduct,
  };
}

// ─── Page ───────────────────────────────────────────────────────────

export default function CommandCenterPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const TYPE_LABELS = getTypeLabels(t);
  const JURISDICTION_NAMES: Record<string, string> = useMemo(
    () => ({
      DE: t("atlas.jurisdiction_de"),
      FR: t("atlas.jurisdiction_fr"),
      UK: t("atlas.jurisdiction_uk"),
      IT: t("atlas.jurisdiction_it"),
      LU: t("atlas.jurisdiction_lu"),
      NL: t("atlas.jurisdiction_nl"),
      BE: t("atlas.jurisdiction_be"),
      ES: t("atlas.jurisdiction_es"),
      NO: t("atlas.jurisdiction_no"),
      SE: t("atlas.jurisdiction_se"),
      FI: t("atlas.jurisdiction_fi"),
      DK: t("atlas.jurisdiction_dk"),
      AT: t("atlas.jurisdiction_at"),
      CH: t("atlas.jurisdiction_ch"),
      PT: t("atlas.jurisdiction_pt"),
      IE: t("atlas.jurisdiction_ie"),
      GR: t("atlas.jurisdiction_gr"),
      CZ: t("atlas.jurisdiction_cz"),
      PL: t("atlas.jurisdiction_pl"),
    }),
    [t],
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 150);
  // M8: greetingKey is derived from new Date().getHours(), which resolves
  // to the server's timezone on SSR and the user's timezone on hydration.
  // Initialise to a neutral value on both sides, then pick the real
  // greeting in an effect after mount — no hydration mismatch.
  const [greetingKey, setGreetingKey] = useState<string>("atlas.greeting_hi");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    setGreetingKey(getGreetingKey());
    setUserName(localStorage.getItem("atlas-user-name") ?? "");
  }, []);

  const results = useMemo(
    () => performSearch(debouncedQuery),
    [debouncedQuery],
  );

  const hasResults = results !== null;
  const [showAllSources, setShowAllSources] = useState(false);

  useEffect(() => {
    setShowAllSources(false);
  }, [debouncedQuery]);

  // M9: previously also bound to Cmd+K, colliding with the global
  // CommandPalette shortcut. Now uses "/" (conventional for page-level
  // search focus) and skips when the user is already typing in a field.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (e.key === "/" && !inField) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setQuery("");
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const totalResults = hasResults
    ? results.jurisdictions.length +
      results.sources.length +
      results.authorities.length +
      results.landingRightsProfiles.length +
      results.landingRightsCaseStudies.length +
      results.landingRightsConduct.length
    : 0;

  return (
    <div className="min-h-screen bg-[#F7F8FA] px-8 lg:px-16">
      {/* ─── Centered search area ─── */}
      <div
        className={`transition-all duration-700 ease-out ${hasResults ? "pt-10" : "pt-[22vh]"}`}
      >
        {/* Greeting */}
        <p
          className={`font-normal text-gray-500 tracking-[-0.01em] transition-all duration-700 ease-out ${hasResults ? "text-[15px] mb-3" : "text-[24px] lg:text-[28px] mb-8"}`}
        >
          {t(greetingKey)}
          {userName && <span className="text-gray-400">, {userName}</span>}
        </p>

        {/* Search Input */}
        <div className="relative mb-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("atlas.search_placeholder")}
            aria-label="Search legal sources, jurisdictions, and authorities"
            spellCheck={false}
            autoComplete="off"
            className={`
              w-full bg-transparent
              border-0 border-b-2 border-gray-200 rounded-none
              outline-none ring-0 shadow-none
              focus:border-gray-900 focus:outline-none focus:ring-0 focus:shadow-none
              text-gray-900 placeholder:text-gray-300
              font-light tracking-[-0.02em] leading-none
              transition-all duration-500
              ${hasResults ? "text-[28px] lg:text-[36px] py-4" : "text-[40px] lg:text-[52px] py-5"}
            `}
            style={{ caretColor: "#111", outline: "none", boxShadow: "none" }}
          />
        </div>

        {/* Subtle stats line */}
        <div
          className={`flex items-center gap-4 transition-all duration-500 ${hasResults ? "opacity-0 h-0 overflow-hidden" : "opacity-100 h-auto"}`}
        >
          <span className="text-[11px] text-gray-500  tracking-wide">
            {t("atlas.sources_count", { count: ALL_SOURCES.length })}
          </span>
          <span className="text-[4px] text-gray-400" aria-hidden="true">
            &#9679;
          </span>
          <span className="text-[11px] text-gray-500  tracking-wide">
            {t("atlas.authorities_count", { count: ALL_AUTHORITIES.length })}
          </span>
          <span className="text-[4px] text-gray-400" aria-hidden="true">
            &#9679;
          </span>
          <span className="text-[11px] text-gray-500  tracking-wide">
            {t("atlas.jurisdictions_count", { count: 19 })}
          </span>
        </div>

        {/* Result count */}
        {hasResults && (
          <div className="flex items-center gap-3 mt-1 mb-8">
            <span className="text-[11px] text-gray-400 ">
              {totalResults === 1
                ? t("atlas.result_count_singular")
                : t("atlas.result_count", { count: totalResults })}
            </span>
            {results.jurisdictions.length > 0 && (
              <span className="text-[10px] text-gray-500">
                {t("atlas.jurisdictions_count", {
                  count: results.jurisdictions.length,
                })}
              </span>
            )}
            {results.sources.length > 0 && (
              <span className="text-[10px] text-gray-500">
                {t("atlas.sources_count", { count: results.sources.length })}
              </span>
            )}
            {results.authorities.length > 0 && (
              <span className="text-[10px] text-gray-500">
                {t("atlas.authorities_count", {
                  count: results.authorities.length,
                })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ─── Results ─── */}
      {hasResults && (
        <div className="space-y-6 pb-20">
          {/* Jurisdictions */}
          {results.jurisdictions.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Globe2
                  size={13}
                  className="text-gray-300"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h2 className="text-[10px] font-semibold text-gray-400 tracking-[0.2em] uppercase">
                  {t("atlas.jurisdictions")}
                </h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {results.jurisdictions.slice(0, 6).map(([code, data]) => (
                  <button
                    key={code}
                    onClick={() => router.push(`/atlas/jurisdictions/${code}`)}
                    className="flex items-center gap-4 px-5 py-4 text-left rounded-xl bg-white border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all duration-200 group"
                  >
                    <span className="text-[22px]  font-bold text-gray-400 w-10 group-hover:text-gray-500 transition-colors">
                      {code}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[15px] font-semibold text-gray-900 group-hover:text-black transition-colors">
                        {JURISDICTION_NAMES[code] || data.countryName}
                      </span>
                      <span className="block text-[11px] text-gray-400 truncate mt-0.5">
                        {data.legislation.name}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${data.legislation.status === "enacted" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}
                    >
                      {t(`atlas.status_${data.legislation.status}`)}
                    </span>
                    <ArrowRight
                      size={14}
                      className="text-gray-400 group-hover:text-gray-900 transition-colors"
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Legal Sources */}
          {results.sources.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Scale
                  size={13}
                  className="text-gray-300"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h2 className="text-[10px] font-semibold text-gray-400 tracking-[0.2em] uppercase">
                  {t("atlas.legal_sources")}
                </h2>
              </div>
              <div className="space-y-1">
                {(showAllSources
                  ? results.sources
                  : results.sources.slice(0, 10)
                ).map((source) => (
                  <button
                    key={source.id}
                    onClick={() => router.push(`/atlas/sources/${source.id}`)}
                    className="w-full flex items-center gap-4 px-5 py-3.5 text-left rounded-xl bg-white border border-transparent hover:border-gray-200 hover:shadow-sm transition-all duration-200 group"
                  >
                    {/* Relevance dot */}
                    <span
                      className={`h-2 w-2 rounded-full flex-shrink-0 ${RELEVANCE_DOT[source.relevance_level]}`}
                    />

                    {/* Type */}
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 w-12 flex-shrink-0 ">
                      {TYPE_LABELS[source.type]}
                    </span>

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <span className="text-[14px] font-medium text-gray-800 truncate block group-hover:text-black transition-colors">
                        {getTranslatedSource(source, language).title}
                      </span>
                      {source.official_reference && (
                        <span className="text-[10px] text-gray-400 ">
                          {source.official_reference}
                        </span>
                      )}
                    </div>

                    {/* Jurisdiction */}
                    <span className="text-[11px]  font-bold text-gray-500 flex-shrink-0">
                      {source.jurisdiction}
                    </span>
                  </button>
                ))}
                {!showAllSources && results.sources.length > 10 && (
                  <button
                    onClick={() => setShowAllSources(true)}
                    aria-expanded={showAllSources}
                    className="w-full py-3 text-[12px] font-medium text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    {t("atlas.show_all", { count: results.sources.length })}
                  </button>
                )}
                {showAllSources && results.sources.length > 10 && (
                  <button
                    onClick={() => setShowAllSources(false)}
                    aria-expanded={showAllSources}
                    className="w-full py-3 text-[12px] font-medium text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    {t("atlas.show_less")}
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Authorities */}
          {results.authorities.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Building2
                  size={13}
                  className="text-gray-300"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h2 className="text-[10px] font-semibold text-gray-400 tracking-[0.2em] uppercase">
                  {t("atlas.authorities")}
                </h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {results.authorities.slice(0, 6).map((auth) => (
                  <button
                    key={auth.id}
                    onClick={() =>
                      router.push(`/atlas/jurisdictions/${auth.jurisdiction}`)
                    }
                    className="flex items-start gap-4 px-5 py-4 text-left rounded-xl bg-white border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all duration-200 group"
                  >
                    <span className="text-[12px] font-bold text-gray-900 bg-gray-100 rounded-md px-2 py-1 flex-shrink-0  mt-0.5">
                      {auth.abbreviation}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[14px] font-semibold text-gray-800 group-hover:text-black transition-colors block">
                        {getTranslatedAuthority(auth, language).name}
                      </span>
                      <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                        {(() => {
                          const m = getTranslatedAuthority(
                            auth,
                            language,
                          ).mandate;
                          return (
                            m.slice(0, 120) + (m.length > 120 ? "..." : "")
                          );
                        })()}
                      </p>
                    </div>
                    <span className="text-[10px]  font-bold text-gray-500 flex-shrink-0 mt-1">
                      {auth.jurisdiction}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {results.landingRightsProfiles.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-[10px] font-semibold text-gray-400 tracking-[0.2em] uppercase">
                  Landing Rights — Profiles
                </h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {results.landingRightsProfiles.slice(0, 6).map((p) => (
                  <button
                    key={p.jurisdiction}
                    onClick={() =>
                      router.push(
                        `/atlas/landing-rights/${p.jurisdiction.toLowerCase()}`,
                      )
                    }
                    className="flex items-center gap-4 px-5 py-4 text-left rounded-xl bg-white border border-gray-100 hover:border-gray-300 transition"
                  >
                    <span className="text-[22px] font-bold text-gray-400 w-10">
                      {p.jurisdiction}
                    </span>
                    <span className="text-[13px] text-gray-700 line-clamp-2 flex-1">
                      {p.overview.summary}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {results.landingRightsCaseStudies.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-[10px] font-semibold text-gray-400 tracking-[0.2em] uppercase">
                  Landing Rights — Case Studies
                </h2>
              </div>
              <div className="space-y-1">
                {results.landingRightsCaseStudies.slice(0, 10).map((cs) => (
                  <button
                    key={cs.id}
                    onClick={() =>
                      router.push(`/atlas/landing-rights/case-studies/${cs.id}`)
                    }
                    className="w-full flex items-center gap-4 px-5 py-3 text-left rounded-xl bg-white border border-transparent hover:border-gray-200 transition"
                  >
                    <span className="text-[11px] font-bold text-gray-500 w-10">
                      {cs.jurisdiction}
                    </span>
                    <span className="text-[13px] font-medium text-gray-800 flex-1">
                      {cs.title}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {results.landingRightsConduct.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-[10px] font-semibold text-gray-400 tracking-[0.2em] uppercase">
                  Landing Rights — Conduct Conditions
                </h2>
              </div>
              <div className="space-y-1">
                {results.landingRightsConduct.slice(0, 10).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/atlas/landing-rights/conduct`)}
                    className="w-full flex items-center gap-4 px-5 py-3 text-left rounded-xl bg-white border border-transparent hover:border-gray-200 transition"
                  >
                    <span className="text-[11px] font-bold text-gray-500 w-10">
                      {c.jurisdiction}
                    </span>
                    <div className="flex-1">
                      <span className="text-[13px] font-medium text-gray-800 block">
                        {c.title}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {c.type.replace("_", " ")}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ─── Legal Footer ─── */}
      <footer
        className={`transition-all duration-700 ${hasResults ? "mt-20" : "mt-40"} pt-8 border-t border-gray-100 pb-10`}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-gray-400 tracking-wider">
              ATLAS
            </span>
            <span className="text-[9px] text-gray-500">
              {t("atlas.footer_by_caelex")}
            </span>
          </div>

          <div className="space-y-3 text-[10px] text-gray-500 leading-[1.7]">
            <p>
              <span className="font-semibold text-gray-500">
                {t("atlas.disclaimer_no_legal_advice")}.
              </span>{" "}
              {t("atlas.disclaimer_body_no_legal_advice")}
            </p>

            <p>
              <span className="font-semibold text-gray-500">
                {t("atlas.disclaimer_no_guarantee")}.
              </span>{" "}
              {t("atlas.disclaimer_body_no_guarantee")}
            </p>

            <p>
              <span className="font-semibold text-gray-500">
                {t("atlas.disclaimer_limitation")}.
              </span>{" "}
              {t("atlas.disclaimer_body_limitation")}
            </p>

            <p>
              <span className="font-semibold text-gray-500">
                {t("atlas.disclaimer_data_sources")}.
              </span>{" "}
              {t("atlas.disclaimer_body_data_sources")}
            </p>

            <p>
              <span className="font-semibold text-gray-500">
                {t("atlas.disclaimer_ip")}.
              </span>{" "}
              {t("atlas.disclaimer_body_ip")}
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-[9px] text-gray-500">
              © {new Date().getFullYear()} Caelex —{" "}
              {t("atlas.footer_all_rights")}
            </span>
            <div className="flex items-center gap-4">
              <a
                href="/legal/privacy"
                className="text-[9px] text-gray-500 hover:text-gray-600 transition-colors"
              >
                {t("atlas.footer_privacy")}
              </a>
              <a
                href="/legal/terms"
                className="text-[9px] text-gray-500 hover:text-gray-600 transition-colors"
              >
                {t("atlas.footer_terms")}
              </a>
              <a
                href="/legal/impressum"
                className="text-[9px] text-gray-500 hover:text-gray-600 transition-colors"
              >
                {t("atlas.footer_impressum")}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
