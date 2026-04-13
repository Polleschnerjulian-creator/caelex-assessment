"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Scale, Building2, Globe2 } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import LiveFeed from "@/components/atlas/LiveFeed";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import {
  LEGAL_SOURCES_DE,
  LEGAL_SOURCES_FR,
  LEGAL_SOURCES_UK,
  LEGAL_SOURCES_IT,
  AUTHORITIES_DE,
  AUTHORITIES_FR,
  AUTHORITIES_UK,
  AUTHORITIES_IT,
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
];

const ALL_AUTHORITIES: Authority[] = [
  ...AUTHORITIES_DE,
  ...AUTHORITIES_FR,
  ...AUTHORITIES_UK,
  ...AUTHORITIES_IT,
];

// ─── Greeting key based on time of day ──────────────────────────────

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "atlas.greeting_evening";
  if (hour < 12) return "atlas.greeting_morning";
  if (hour < 17) return "atlas.greeting_afternoon";
  return "atlas.greeting_evening";
}

// ─── Debounce hook ───────────────────────────────────────────────────

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Type badge colors ───────────────────────────────────────────────

const TYPE_STYLES: Record<LegalSourceType, { bg: string; text: string }> = {
  international_treaty: {
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
  },
  federal_law: {
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
  },
  federal_regulation: {
    bg: "bg-teal-50 border-teal-200",
    text: "text-teal-700",
  },
  technical_standard: {
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
  },
  eu_regulation: {
    bg: "bg-purple-50 border-purple-200",
    text: "text-purple-700",
  },
  eu_directive: {
    bg: "bg-violet-50 border-violet-200",
    text: "text-violet-700",
  },
  policy_document: { bg: "bg-gray-50 border-gray-200", text: "text-gray-600" },
  draft_legislation: {
    bg: "bg-orange-50 border-orange-200",
    text: "text-orange-700",
  },
};

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

const RELEVANCE_STYLES: Record<RelevanceLevel, string> = {
  fundamental: "text-gray-900 font-semibold",
  critical: "text-red-600",
  high: "text-amber-600",
  medium: "text-gray-500",
  low: "text-gray-400",
};

const JURISDICTION_FLAGS: Record<string, string> = {
  DE: "DE",
  FR: "FR",
  UK: "UK",
  IT: "IT",
  INT: "INT",
  EU: "EU",
};

// ─── Search logic ────────────────────────────────────────────────────

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

// ─── Page ────────────────────────────────────────────────────────────

export default function CommandCenterPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 150);
  const [greetingKey] = useState(getGreetingKey);

  const results = useMemo(
    () => performSearch(debouncedQuery),
    [debouncedQuery],
  );

  const hasResults = results !== null;
  const [showAllSources, setShowAllSources] = useState(false);

  // Reset "show all" when query changes
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

  return (
    <div className="min-h-screen bg-[#F7F8FA] px-8 lg:px-16 py-12">
      {/* ─── Greeting ─── */}
      <div
        className={`transition-all duration-700 ease-out ${hasResults ? "mb-4" : "mb-8"}`}
      >
        <p
          className={`font-normal text-gray-300 tracking-[-0.01em] transition-all duration-700 ease-out ${hasResults ? "text-[16px]" : "text-[22px]"}`}
        >
          {t(greetingKey)}
        </p>
      </div>

      {/* ─── Search Input ─── */}
      <div
        className={`relative transition-all duration-700 ease-out ${hasResults ? "mb-10" : "mb-12"}`}
      >
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
            border-0 border-b border-gray-200 rounded-none
            outline-none ring-0 shadow-none
            focus:border-gray-300 focus:outline-none focus:ring-0 focus:shadow-none
            text-gray-900 placeholder:text-gray-300
            font-light tracking-[-0.02em] leading-none
            transition-colors duration-300
            ${hasResults ? "text-[24px] lg:text-[28px] py-3" : "text-[32px] lg:text-[40px] py-4"}
          `}
          style={{ caretColor: "#10B981", outline: "none", boxShadow: "none" }}
        />
      </div>

      {/* ─── Empty State ─── */}
      {!hasResults && (
        <div className="space-y-8">
          {/* Quick access */}
          <div className="flex items-center gap-6">
            {[
              { code: "DE", name: "Germany" },
              { code: "FR", name: "France" },
              { code: "UK", name: "United Kingdom" },
              { code: "IT", name: "Italy" },
            ].map((j) => (
              <button
                key={j.code}
                onClick={() => router.push(`/atlas/jurisdictions/${j.code}`)}
                className="text-[13px] text-gray-400 hover:text-gray-900 transition-colors duration-200"
              >
                {j.name}
              </button>
            ))}
            <span className="text-[12px] text-gray-300">
              {t("atlas.sources_count", { count: ALL_SOURCES.length })} &middot;{" "}
              {t("atlas.jurisdictions_count", {
                count: JURISDICTION_DATA.size,
              })}
            </span>
          </div>
        </div>
      )}

      {/* ─── Results ─── */}
      {hasResults && (
        <div className="space-y-8">
          {/* Jurisdictions */}
          {results.jurisdictions.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Globe2 size={15} className="text-gray-400" strokeWidth={1.5} />
                <h2 className="text-[11px] font-semibold text-gray-400 tracking-[0.15em] uppercase">
                  {t("atlas.jurisdictions")}
                </h2>
                <span className="text-[11px] text-gray-300">
                  {results.jurisdictions.length}
                </span>
              </div>
              <div className="space-y-1">
                {results.jurisdictions.slice(0, 5).map(([code, data]) => (
                  <button
                    key={code}
                    onClick={() => router.push(`/atlas/jurisdictions/${code}`)}
                    className="
                      w-full flex items-center gap-4 px-4 py-3
                      text-left rounded-xl
                      hover:bg-white hover:shadow-sm
                      transition-all duration-150 group
                    "
                  >
                    <span className="text-[13px] font-mono font-semibold text-gray-400 w-7">
                      {code}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[15px] font-medium text-gray-900 group-hover:text-emerald-700 transition-colors">
                        {data.countryName}
                      </span>
                      <span className="text-[13px] text-gray-400 ml-3">
                        {data.legislation.name}
                      </span>
                    </div>
                    <span
                      className={`
                        text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full
                        ${data.legislation.status === "enacted" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}
                      `}
                    >
                      {data.legislation.status}
                    </span>
                    <ArrowRight
                      size={14}
                      className="text-gray-300 group-hover:text-emerald-500 transition-colors"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Legal Sources */}
          {results.sources.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Scale size={15} className="text-gray-400" strokeWidth={1.5} />
                <h2 className="text-[11px] font-semibold text-gray-400 tracking-[0.15em] uppercase">
                  {t("atlas.legal_sources")}
                </h2>
                <span className="text-[11px] text-gray-300">
                  {results.sources.length}
                </span>
              </div>
              <div className="space-y-1">
                {(showAllSources
                  ? results.sources
                  : results.sources.slice(0, 8)
                ).map((source) => (
                  <button
                    key={source.id}
                    onClick={() => router.push(`/atlas/sources/${source.id}`)}
                    className="
                      w-full flex items-center gap-4 px-4 py-3
                      text-left rounded-xl
                      hover:bg-white hover:shadow-sm
                      transition-all duration-150 group
                    "
                  >
                    {/* Type badge */}
                    <span
                      className={`
                        text-[9px] font-semibold uppercase tracking-wider
                        px-2 py-0.5 rounded border flex-shrink-0 w-14 text-center
                        ${TYPE_STYLES[source.type]?.bg} ${TYPE_STYLES[source.type]?.text}
                      `}
                    >
                      {TYPE_LABELS[source.type]}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-medium text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                          {getTranslatedSource(source, language).title}
                        </span>
                      </div>
                      {source.official_reference && (
                        <span className="text-[11px] text-gray-400 font-mono">
                          {source.official_reference}
                        </span>
                      )}
                    </div>

                    {/* Jurisdiction */}
                    <span className="text-[11px] font-mono text-gray-400 flex-shrink-0">
                      {JURISDICTION_FLAGS[source.jurisdiction] ??
                        source.jurisdiction}
                    </span>

                    {/* Relevance */}
                    <span
                      className={`text-[10px] uppercase tracking-wider flex-shrink-0 ${RELEVANCE_STYLES[source.relevance_level]}`}
                    >
                      {source.relevance_level}
                    </span>
                  </button>
                ))}
                {!showAllSources && results.sources.length > 8 && (
                  <button
                    onClick={() => setShowAllSources(true)}
                    className="text-[12px] text-gray-400 hover:text-gray-900 px-4 pt-2 transition-colors duration-200"
                  >
                    {t("atlas.show_all", { count: results.sources.length })}
                  </button>
                )}
                {showAllSources && results.sources.length > 8 && (
                  <button
                    onClick={() => setShowAllSources(false)}
                    className="text-[12px] text-gray-400 hover:text-gray-900 px-4 pt-2 transition-colors duration-200"
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
              <div className="flex items-center gap-2 mb-3">
                <Building2
                  size={15}
                  className="text-gray-400"
                  strokeWidth={1.5}
                />
                <h2 className="text-[11px] font-semibold text-gray-400 tracking-[0.15em] uppercase">
                  {t("atlas.authorities")}
                </h2>
                <span className="text-[11px] text-gray-300">
                  {results.authorities.length}
                </span>
              </div>
              <div className="space-y-1">
                {results.authorities.slice(0, 5).map((auth) => (
                  <button
                    key={auth.id}
                    onClick={() =>
                      router.push(`/atlas/jurisdictions/${auth.jurisdiction}`)
                    }
                    className="
                      w-full flex items-center gap-4 px-4 py-3
                      text-left rounded-xl
                      hover:bg-white hover:shadow-sm
                      transition-all duration-150 group
                    "
                  >
                    {/* Abbreviation badge */}
                    <span className="text-[10px] font-bold text-gray-600 bg-gray-100 border border-gray-200 rounded px-2 py-1 flex-shrink-0 w-14 text-center font-mono">
                      {auth.abbreviation}
                    </span>

                    <div className="flex-1 min-w-0">
                      <span className="text-[14px] font-medium text-gray-900 group-hover:text-emerald-700 transition-colors">
                        {getTranslatedAuthority(auth, language).name}
                      </span>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {(() => {
                          const m = getTranslatedAuthority(
                            auth,
                            language,
                          ).mandate;
                          return (
                            m.slice(0, 100) + (m.length > 100 ? "..." : "")
                          );
                        })()}
                      </p>
                    </div>

                    <span className="text-[11px] font-mono text-gray-400 flex-shrink-0">
                      {auth.jurisdiction}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ─── Regulatory Overview ─── */}
      {!hasResults && (
        <div className="mt-14">
          <h2 className="text-[11px] font-medium text-gray-400 tracking-[0.15em] uppercase mb-4">
            {t("atlas.tracked_jurisdictions")}
          </h2>
          <LiveFeed />
        </div>
      )}

      {/* ─── Legal Footer ─── */}
      <footer className="mt-40 pt-8 border-t border-gray-200">
        <div className="max-w-5xl space-y-4">
          {/* Product attribution */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-500 tracking-wide">
              ATLAS
            </span>
            <span className="text-[10px] text-gray-300">by</span>
            <span className="text-[11px] font-semibold text-gray-500 tracking-wide">
              Caelex
            </span>
          </div>

          {/* Comprehensive disclaimer */}
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
              to change without notice. Legislative references — including EU
              Space Act citations based on COM(2025) 335 — refer to legislative
              proposals that may be substantially amended during the legislative
              process. National law data reflects the state of research at the
              time of last verification and may not reflect subsequent
              amendments, judicial interpretations, or administrative practice.
            </p>

            <p>
              <span className="font-semibold text-gray-500">
                {t("atlas.disclaimer_limitation")}.
              </span>{" "}
              To the maximum extent permitted by applicable law, Caelex, its
              directors, employees, and agents shall not be liable for any
              direct, indirect, incidental, consequential, or special damages —
              including but not limited to loss of profits, regulatory
              penalties, fines, business interruption, or reputational harm —
              arising from or in connection with the use of or reliance on
              information provided through ATLAS. This limitation applies
              regardless of the legal theory upon which such damages are
              claimed.
            </p>

            <p>
              <span className="font-semibold text-gray-500">
                {t("atlas.disclaimer_third_party")}.
              </span>{" "}
              ATLAS data and outputs are provided solely for the internal
              research and information purposes of the licensed user. Users
              shall not represent ATLAS outputs as certified compliance
              assessments, legal opinions, or regulatory clearances to third
              parties, regulators, investors, or courts. Any reliance by third
              parties on ATLAS-derived information is at their own risk and
              without recourse to Caelex.
            </p>

            <p>
              <span className="font-semibold text-gray-500">
                {t("atlas.disclaimer_data_sources")}.
              </span>{" "}
              ATLAS aggregates information from public legislative databases,
              official government publications, international treaty
              collections, and authoritative regulatory sources. Primary sources
              include EUR-Lex, national official gazettes (Bundesgesetzblatt,
              Journal Officiel, Gazzetta Ufficiale, legislation.gov.uk), UNOOSA
              treaty database, ITU, ESA, BSI, CNES, CAA, and ASI publications.
              While Caelex endeavours to maintain current and accurate data, the
              platform is not affiliated with, endorsed by, or officially
              connected to any government authority, regulatory body, or
              international organization referenced herein.
            </p>

            <p>
              <span className="font-semibold text-gray-500">
                {t("atlas.disclaimer_ip")}.
              </span>{" "}
              ATLAS, including its regulatory data structures, compliance
              mappings, cross-reference frameworks, and analytical
              methodologies, is proprietary to Caelex. All rights reserved.
              Unauthorized reproduction, reverse-engineering, or use of ATLAS
              data to build competing products or services is strictly
              prohibited.
            </p>
          </div>

          {/* Bottom line */}
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
