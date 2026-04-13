"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Scale, Building2, Globe2 } from "lucide-react";
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

// ─── Greeting based on time of day ───────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 150);
  const [greeting] = useState(getGreeting);

  const results = useMemo(
    () => performSearch(debouncedQuery),
    [debouncedQuery],
  );

  const hasResults = results !== null;

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
        className={`transition-all duration-500 ease-out ${hasResults ? "mb-6" : "mb-10"}`}
      >
        <h1
          className={`font-light text-gray-400 tracking-tight transition-all duration-500 ${hasResults ? "text-[20px]" : "text-[28px]"}`}
        >
          {greeting}
        </h1>
      </div>

      {/* ─── Search Input (open line, no box) ─── */}
      <div className="relative mb-8">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search jurisdictions, laws, authorities, standards..."
          className={`
            w-full bg-transparent border-0 border-b-2 border-gray-300
            focus:border-gray-900 focus:outline-none
            text-gray-900 placeholder:text-gray-300
            caret-emerald-500
            transition-all duration-300
            ${hasResults ? "text-[28px] pb-3" : "text-[40px] lg:text-[48px] pb-4"}
          `}
          style={{
            caretColor: "#10B981",
          }}
        />

        {/* Subtle hint */}
        {!query && (
          <div className="absolute right-0 bottom-5 flex items-center gap-2">
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-100 rounded border border-gray-200">
              ⌘K
            </kbd>
          </div>
        )}
      </div>

      {/* ─── Empty State ─── */}
      {!hasResults && (
        <div className="space-y-8">
          {/* Quick access */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[12px] text-gray-400 tracking-wide uppercase mr-1">
              Jump to
            </span>
            {[
              { code: "DE", name: "Germany" },
              { code: "FR", name: "France" },
              { code: "UK", name: "United Kingdom" },
              { code: "IT", name: "Italy" },
            ].map((j) => (
              <button
                key={j.code}
                onClick={() => router.push(`/atlas/jurisdictions/${j.code}`)}
                className="
                  px-3 py-1.5 text-[13px] font-medium text-gray-600
                  bg-white border border-gray-200 rounded-lg
                  hover:border-gray-400 hover:text-gray-900
                  transition-all duration-150
                "
              >
                {j.name}
              </button>
            ))}
          </div>

          {/* Stats line */}
          <p className="text-[13px] text-gray-400">
            {ALL_SOURCES.length} legal sources &middot; {ALL_AUTHORITIES.length}{" "}
            authorities &middot; {JURISDICTION_DATA.size} jurisdictions
          </p>
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
                  Jurisdictions
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
                  Legal Sources
                </h2>
                <span className="text-[11px] text-gray-300">
                  {results.sources.length}
                </span>
              </div>
              <div className="space-y-1">
                {results.sources.slice(0, 8).map((source) => (
                  <button
                    key={source.id}
                    onClick={() =>
                      router.push(
                        `/atlas/jurisdictions/${source.jurisdiction === "INT" || source.jurisdiction === "EU" ? "DE" : source.jurisdiction}`,
                      )
                    }
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
                          {source.title_en}
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
                {results.sources.length > 8 && (
                  <p className="text-[12px] text-gray-400 px-4 pt-1">
                    + {results.sources.length - 8} more results
                  </p>
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
                  Authorities
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
                        {auth.name_en}
                      </span>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {auth.space_mandate.slice(0, 100)}
                        {auth.space_mandate.length > 100 ? "..." : ""}
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
            Tracked jurisdictions
          </h2>
          <LiveFeed />
        </div>
      )}

      {/* ─── Disclaimer ─── */}
      <footer className="mt-16 text-[9px] text-gray-400 leading-relaxed max-w-2xl">
        ATLAS is an information tool, not legal advice. Caelex assumes no
        guarantee for completeness, accuracy, or timeliness.
      </footer>
    </div>
  );
}
