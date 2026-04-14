"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Scale, Building2, Globe2 } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import {
  LEGAL_SOURCES_DE,
  LEGAL_SOURCES_FR,
  LEGAL_SOURCES_UK,
  LEGAL_SOURCES_IT,
  LEGAL_SOURCES_LU,
  LEGAL_SOURCES_NL,
  LEGAL_SOURCES_BE,
  LEGAL_SOURCES_ES,
  LEGAL_SOURCES_NO,
  LEGAL_SOURCES_SE,
  LEGAL_SOURCES_FI,
  LEGAL_SOURCES_DK,
  LEGAL_SOURCES_AT,
  LEGAL_SOURCES_CH,
  AUTHORITIES_DE,
  AUTHORITIES_FR,
  AUTHORITIES_UK,
  AUTHORITIES_IT,
  AUTHORITIES_LU,
  AUTHORITIES_NL,
  AUTHORITIES_BE,
  AUTHORITIES_ES,
  AUTHORITIES_NO,
  AUTHORITIES_SE,
  AUTHORITIES_FI,
  AUTHORITIES_DK,
  AUTHORITIES_AT,
  AUTHORITIES_CH,
  getTranslatedSource,
  getTranslatedAuthority,
} from "@/data/legal-sources";
import type {
  LegalSource,
  Authority,
  LegalSourceType,
  RelevanceLevel,
} from "@/data/legal-sources";

// ─── Aggregated data ─────────────────────────────────────────────────

const ALL_SOURCES: LegalSource[] = [
  ...LEGAL_SOURCES_DE,
  ...LEGAL_SOURCES_FR,
  ...LEGAL_SOURCES_UK,
  ...LEGAL_SOURCES_IT,
  ...LEGAL_SOURCES_LU,
  ...LEGAL_SOURCES_NL,
  ...LEGAL_SOURCES_BE,
  ...LEGAL_SOURCES_ES,
  ...LEGAL_SOURCES_NO,
  ...LEGAL_SOURCES_SE,
  ...LEGAL_SOURCES_FI,
  ...LEGAL_SOURCES_DK,
  ...LEGAL_SOURCES_AT,
  ...LEGAL_SOURCES_CH,
];

const ALL_AUTHORITIES: Authority[] = [
  ...AUTHORITIES_DE,
  ...AUTHORITIES_FR,
  ...AUTHORITIES_UK,
  ...AUTHORITIES_IT,
  ...AUTHORITIES_LU,
  ...AUTHORITIES_NL,
  ...AUTHORITIES_BE,
  ...AUTHORITIES_ES,
  ...AUTHORITIES_NO,
  ...AUTHORITIES_SE,
  ...AUTHORITIES_FI,
  ...AUTHORITIES_DK,
  ...AUTHORITIES_AT,
  ...AUTHORITIES_CH,
];

// ─── Style maps ─────────────────────────────────────────────────────

const TYPE_LABELS: Record<LegalSourceType, string> = {
  international_treaty: "Treaty",
  federal_law: "Law",
  federal_regulation: "Regulation",
  technical_standard: "Standard",
  eu_regulation: "EU Reg",
  eu_directive: "EU Dir",
  policy_document: "Policy",
  draft_legislation: "Draft",
};

const RELEVANCE_DOT: Record<RelevanceLevel, string> = {
  fundamental: "bg-gray-900",
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-gray-300",
  low: "bg-gray-200",
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

  const sources = ALL_SOURCES.filter(
    (s) =>
      s.title_en.toLowerCase().includes(q) ||
      s.title_local?.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.official_reference?.toLowerCase().includes(q) ||
      s.compliance_areas.some((a) => a.toLowerCase().includes(q)) ||
      s.key_provisions.some(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.summary.toLowerCase().includes(q),
      ),
  );

  const authorities = ALL_AUTHORITIES.filter(
    (a) =>
      a.name_en.toLowerCase().includes(q) ||
      a.name_local.toLowerCase().includes(q) ||
      a.abbreviation.toLowerCase().includes(q) ||
      a.space_mandate.toLowerCase().includes(q),
  );

  if (
    jurisdictions.length === 0 &&
    sources.length === 0 &&
    authorities.length === 0
  ) {
    return null;
  }

  return { jurisdictions, sources, authorities };
}

// ─── Page ───────────────────────────────────────────────────────────

export default function CommandCenterPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 150);
  const [greetingKey] = useState(getGreetingKey);
  const [userName, setUserName] = useState("");

  useEffect(() => {
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

  // Cmd+K to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
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
      results.authorities.length
    : 0;

  return (
    <div className="min-h-screen bg-[#F7F8FA] px-8 lg:px-16">
      {/* ─── Centered search area ─── */}
      <div
        className={`transition-all duration-700 ease-out ${hasResults ? "pt-10" : "pt-[22vh]"}`}
      >
        {/* Greeting */}
        <p
          className={`font-normal text-gray-300 tracking-[-0.01em] transition-all duration-700 ease-out ${hasResults ? "text-[15px] mb-3" : "text-[24px] lg:text-[28px] mb-8"}`}
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
          <span className="text-[11px] text-gray-300 font-mono tracking-wide">
            {ALL_SOURCES.length} sources
          </span>
          <span className="text-[4px] text-gray-200">&#9679;</span>
          <span className="text-[11px] text-gray-300 font-mono tracking-wide">
            {ALL_AUTHORITIES.length} authorities
          </span>
          <span className="text-[4px] text-gray-200">&#9679;</span>
          <span className="text-[11px] text-gray-300 font-mono tracking-wide">
            14 jurisdictions
          </span>
        </div>

        {/* Result count */}
        {hasResults && (
          <div className="flex items-center gap-3 mt-1 mb-8">
            <span className="text-[11px] text-gray-400 font-mono">
              {totalResults} {totalResults === 1 ? "result" : "results"}
            </span>
            {results.jurisdictions.length > 0 && (
              <span className="text-[10px] text-gray-300">
                {results.jurisdictions.length} jurisdictions
              </span>
            )}
            {results.sources.length > 0 && (
              <span className="text-[10px] text-gray-300">
                {results.sources.length} sources
              </span>
            )}
            {results.authorities.length > 0 && (
              <span className="text-[10px] text-gray-300">
                {results.authorities.length} authorities
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
                <Globe2 size={13} className="text-gray-300" strokeWidth={1.5} />
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
                    <span className="text-[22px] font-mono font-bold text-gray-200 w-10 group-hover:text-gray-400 transition-colors">
                      {code}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[15px] font-semibold text-gray-900 group-hover:text-black transition-colors">
                        {data.countryName}
                      </span>
                      <span className="block text-[11px] text-gray-400 truncate mt-0.5">
                        {data.legislation.name}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${data.legislation.status === "enacted" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}
                    >
                      {data.legislation.status}
                    </span>
                    <ArrowRight
                      size={14}
                      className="text-gray-200 group-hover:text-gray-900 transition-colors"
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
                <Scale size={13} className="text-gray-300" strokeWidth={1.5} />
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
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 w-12 flex-shrink-0 font-mono">
                      {TYPE_LABELS[source.type]}
                    </span>

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <span className="text-[14px] font-medium text-gray-800 truncate block group-hover:text-black transition-colors">
                        {getTranslatedSource(source, language).title}
                      </span>
                      {source.official_reference && (
                        <span className="text-[10px] text-gray-400 font-mono">
                          {source.official_reference}
                        </span>
                      )}
                    </div>

                    {/* Jurisdiction */}
                    <span className="text-[11px] font-mono font-bold text-gray-300 flex-shrink-0">
                      {source.jurisdiction}
                    </span>
                  </button>
                ))}
                {!showAllSources && results.sources.length > 10 && (
                  <button
                    onClick={() => setShowAllSources(true)}
                    className="w-full py-3 text-[12px] font-medium text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    {t("atlas.show_all", { count: results.sources.length })}
                  </button>
                )}
                {showAllSources && results.sources.length > 10 && (
                  <button
                    onClick={() => setShowAllSources(false)}
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
                    <span className="text-[12px] font-bold text-gray-900 bg-gray-100 rounded-md px-2 py-1 flex-shrink-0 font-mono mt-0.5">
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
                    <span className="text-[10px] font-mono font-bold text-gray-300 flex-shrink-0 mt-1">
                      {auth.jurisdiction}
                    </span>
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
        <div className="max-w-4xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-gray-400 tracking-wider">
              ATLAS
            </span>
            <span className="text-[9px] text-gray-300">by Caelex</span>
          </div>

          <div className="space-y-3 text-[10px] text-gray-400 leading-[1.7]">
            <p>
              <span className="font-semibold text-gray-500">
                {t("atlas.disclaimer_no_legal_advice")}.
              </span>{" "}
              ATLAS is a regulatory information and research tool developed by
              Caelex. The information, data, assessments, and comparative
              analyses provided through ATLAS do not constitute legal,
              compliance, tax, or professional advice of any kind. No
              attorney-client, advisory, or fiduciary relationship is created
              between Caelex and any user through access to or use of ATLAS.
              Users must independently verify all information and consult
              qualified legal counsel before making compliance, licensing, or
              business decisions.
            </p>

            <p>
              <span className="font-semibold text-gray-500">
                {t("atlas.disclaimer_no_guarantee")}.
              </span>{" "}
              Caelex makes no representation or warranty, express or implied,
              regarding the accuracy, completeness, timeliness, or reliability
              of any data presented in ATLAS. Regulatory frameworks are subject
              to change without notice. National law data reflects the state of
              research at the time of last verification and may not reflect
              subsequent amendments, judicial interpretations, or administrative
              practice.
            </p>

            <p>
              <span className="font-semibold text-gray-500">
                {t("atlas.disclaimer_limitation")}.
              </span>{" "}
              To the maximum extent permitted by applicable law, Caelex shall
              not be liable for any direct, indirect, incidental, consequential,
              or special damages arising from or in connection with the use of
              or reliance on information provided through ATLAS.
            </p>

            <p>
              <span className="font-semibold text-gray-500">
                {t("atlas.disclaimer_data_sources")}.
              </span>{" "}
              ATLAS aggregates information from public legislative databases,
              official government publications, international treaty
              collections, and authoritative regulatory sources. Caelex is not
              affiliated with, endorsed by, or officially connected to any
              government authority, regulatory body, or international
              organization referenced herein.
            </p>

            <p>
              <span className="font-semibold text-gray-500">
                {t("atlas.disclaimer_ip")}.
              </span>{" "}
              ATLAS, including its regulatory data structures, compliance
              mappings, and analytical methodologies, is proprietary to Caelex.
              All rights reserved.
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-[9px] text-gray-300">
              © {new Date().getFullYear()} Caelex — All rights reserved
            </span>
            <div className="flex items-center gap-4">
              <a
                href="/legal/privacy"
                className="text-[9px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                Privacy
              </a>
              <a
                href="/legal/terms"
                className="text-[9px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                Terms
              </a>
              <a
                href="/legal/impressum"
                className="text-[9px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                Impressum
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
