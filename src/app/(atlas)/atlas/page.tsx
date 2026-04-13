"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowRight,
  Scale,
  Building2,
  Globe2,
  ShieldCheck,
} from "lucide-react";
import QuickStats from "@/components/atlas/QuickStats";
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
  ComplianceArea,
} from "@/data/legal-sources";
import type { JurisdictionLaw } from "@/lib/space-law-types";

// ─── Aggregated data (static, computed once at module level) ────────

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

// ─── Jurisdiction flag lookup from JURISDICTION_DATA ────────────────

const JURISDICTION_FLAGS: Record<string, string> = {};
JURISDICTION_DATA.forEach((law) => {
  JURISDICTION_FLAGS[law.countryCode] = law.flagEmoji;
});

// Quick-access jurisdiction codes (the 4 with deep legal source data)
const QUICK_ACCESS_JURISDICTIONS = ["DE", "FR", "UK", "IT"] as const;

// ─── Compliance area labels ─────────────────────────────────────────

const COMPLIANCE_AREA_LABELS: Record<ComplianceArea, string> = {
  licensing: "Licensing",
  registration: "Registration",
  liability: "Liability",
  insurance: "Insurance",
  cybersecurity: "Cybersecurity",
  export_control: "Export Control",
  data_security: "Data Security",
  frequency_spectrum: "Frequency & Spectrum",
  environmental: "Environmental",
  debris_mitigation: "Debris Mitigation",
  space_traffic_management: "Space Traffic Management",
  human_spaceflight: "Human Spaceflight",
  military_dual_use: "Military & Dual Use",
};

// ─── Type / relevance badge config ──────────────────────────────────

const TYPE_BADGE_COLORS: Record<LegalSourceType, string> = {
  international_treaty: "bg-blue-100 text-blue-700",
  federal_law: "bg-emerald-100 text-emerald-700",
  federal_regulation: "bg-teal-100 text-teal-700",
  technical_standard: "bg-amber-100 text-amber-700",
  eu_regulation: "bg-purple-100 text-purple-700",
  eu_directive: "bg-violet-100 text-violet-700",
  policy_document: "bg-gray-100 text-gray-600",
  draft_legislation: "bg-orange-100 text-orange-700",
};

const TYPE_LABELS: Record<LegalSourceType, string> = {
  international_treaty: "Treaty",
  federal_law: "Law",
  federal_regulation: "Regulation",
  technical_standard: "Standard",
  eu_regulation: "EU Reg.",
  eu_directive: "EU Dir.",
  policy_document: "Policy",
  draft_legislation: "Draft",
};

const RELEVANCE_BADGE_COLORS: Record<RelevanceLevel, string> = {
  fundamental: "bg-gray-900 text-white",
  critical: "bg-red-100 text-red-700",
  high: "bg-amber-100 text-amber-700",
  medium: "bg-gray-100 text-gray-600",
  low: "bg-gray-50 text-gray-400",
};

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  enacted: { label: "Enacted", color: "bg-emerald-100 text-emerald-700" },
  draft: { label: "Draft", color: "bg-amber-100 text-amber-700" },
  pending: { label: "Pending", color: "bg-blue-100 text-blue-700" },
  none: { label: "No Law", color: "bg-gray-100 text-gray-500" },
};

// ─── Search result types ────────────────────────────────────────────

interface SearchResults {
  jurisdictions: [string, JurisdictionLaw][];
  sources: LegalSource[];
  authorities: Authority[];
  complianceAreas: { area: ComplianceArea; label: string; count: number }[];
  totalJurisdictions: number;
  totalSources: number;
  totalAuthorities: number;
  totalComplianceAreas: number;
}

// ─── Search logic ───────────────────────────────────────────────────

function performSearch(query: string): SearchResults | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  // Search jurisdictions
  const allJurisdictions = [...JURISDICTION_DATA.entries()].filter(
    ([code, data]) =>
      data.countryName.toLowerCase().includes(q) ||
      code.toLowerCase().includes(q) ||
      data.legislation.name.toLowerCase().includes(q) ||
      data.legislation.nameLocal.toLowerCase().includes(q) ||
      data.licensingAuthority.name.toLowerCase().includes(q),
  );

  // Search legal sources
  const allSources = ALL_SOURCES.filter(
    (s) =>
      s.title_en.toLowerCase().includes(q) ||
      (s.title_local && s.title_local.toLowerCase().includes(q)) ||
      s.id.toLowerCase().includes(q) ||
      (s.official_reference &&
        s.official_reference.toLowerCase().includes(q)) ||
      s.key_provisions.some(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.summary.toLowerCase().includes(q),
      ),
  );

  // Search authorities
  const allAuthorities = ALL_AUTHORITIES.filter(
    (a) =>
      a.name_en.toLowerCase().includes(q) ||
      a.name_local.toLowerCase().includes(q) ||
      a.abbreviation.toLowerCase().includes(q) ||
      a.space_mandate.toLowerCase().includes(q),
  );

  // Search compliance areas
  const areaMatches: { area: ComplianceArea; label: string; count: number }[] =
    [];
  for (const [area, label] of Object.entries(COMPLIANCE_AREA_LABELS) as [
    ComplianceArea,
    string,
  ][]) {
    if (
      label.toLowerCase().includes(q) ||
      area.toLowerCase().replace(/_/g, " ").includes(q)
    ) {
      const count = ALL_SOURCES.filter((s) =>
        s.compliance_areas.includes(area),
      ).length;
      areaMatches.push({ area, label, count });
    }
  }

  return {
    jurisdictions: allJurisdictions.slice(0, 5),
    sources: allSources.slice(0, 5),
    authorities: allAuthorities.slice(0, 5),
    complianceAreas: areaMatches.slice(0, 5),
    totalJurisdictions: allJurisdictions.length,
    totalSources: allSources.length,
    totalAuthorities: allAuthorities.length,
    totalComplianceAreas: areaMatches.length,
  };
}

// ─── Debounce hook ──────────────────────────────────────────────────

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─── Main page component ───────────────────────────────────────────

export default function CommandCenterPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 150);

  const results = useMemo(
    () => performSearch(debouncedQuery),
    [debouncedQuery],
  );

  const hasResults = results !== null;
  const hasAnyResult =
    hasResults &&
    (results.jurisdictions.length > 0 ||
      results.sources.length > 0 ||
      results.authorities.length > 0 ||
      results.complianceAreas.length > 0);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setQuery("");
      inputRef.current?.blur();
    }
  }, []);

  // Keyboard shortcut: Cmd+K or Ctrl+K to focus search
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  const totalSources = ALL_SOURCES.length;
  const totalAuthorities = ALL_AUTHORITIES.length;
  const totalJurisdictions = JURISDICTION_DATA.size;

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F8FA]">
      {/* ─── Search Hero ─── */}
      <div
        className={`flex flex-col items-center justify-center transition-all duration-500 ease-out ${
          hasResults ? "pt-12 pb-6" : "pt-[18vh] pb-10"
        }`}
      >
        {/* Title — only visible when empty */}
        <div
          className={`transition-all duration-500 ease-out overflow-hidden ${
            hasResults ? "max-h-0 opacity-0 mb-0" : "max-h-24 opacity-100 mb-8"
          }`}
        >
          <h1 className="text-[28px] font-semibold tracking-tight text-gray-900 text-center">
            ATLAS Command Center
          </h1>
          <p className="text-sm text-gray-400 mt-1 text-center">
            Space law intelligence across {totalJurisdictions} jurisdictions
          </p>
        </div>

        {/* Search input container */}
        <div className="w-full max-w-[680px] px-6">
          <div
            className={`relative bg-white rounded-2xl transition-all duration-300 ${
              isFocused
                ? "shadow-lg shadow-gray-200/60 ring-1 ring-gray-300"
                : "shadow-sm border border-gray-200"
            }`}
          >
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none"
              strokeWidth={1.5}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="Search jurisdictions, laws, authorities, standards..."
              className="w-full text-lg font-normal text-gray-900 placeholder:text-gray-400 bg-transparent pl-14 pr-20 py-4 rounded-2xl outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            {/* Keyboard shortcut hint */}
            {!query && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium text-gray-400 bg-gray-100 rounded border border-gray-200">
                  ⌘K
                </kbd>
              </div>
            )}
            {/* Clear button */}
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-medium text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md px-2 py-1 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Subtle stats line below search */}
          <div
            className={`text-center transition-all duration-500 ease-out overflow-hidden ${
              hasResults ? "max-h-0 opacity-0 mt-0" : "max-h-8 opacity-100 mt-3"
            }`}
          >
            <p className="text-xs text-gray-400">
              {totalSources} legal sources &middot; {totalAuthorities}{" "}
              authorities &middot; {totalJurisdictions} jurisdictions
            </p>
          </div>
        </div>
      </div>

      {/* ─── Empty State: Quick Access + Stats ─── */}
      <div
        className={`transition-all duration-500 ease-out overflow-hidden ${
          hasResults ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
        }`}
      >
        <div className="flex flex-col items-center gap-6 px-6 pt-4">
          {/* Quick access jurisdiction pills */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 mr-1">Jump to:</span>
            {QUICK_ACCESS_JURISDICTIONS.map((code) => {
              const law = JURISDICTION_DATA.get(code);
              if (!law) return null;
              return (
                <button
                  key={code}
                  onClick={() => router.push(`/atlas/jurisdictions/${code}`)}
                  className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-sm"
                >
                  <span className="text-base leading-none">
                    {law.flagEmoji}
                  </span>
                  <span className="text-gray-700 font-medium text-[13px] group-hover:text-gray-900 transition-colors">
                    {code}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => {
                setQuery("enacted");
                inputRef.current?.focus();
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-[13px] text-gray-500 hover:text-gray-700"
            >
              Recently enacted
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* QuickStats — compact, centered */}
          <div className="w-full max-w-[680px]">
            <QuickStats />
          </div>
        </div>
      </div>

      {/* ─── Search Results ─── */}
      {hasResults && (
        <div className="w-full max-w-[680px] mx-auto px-6 pb-12 space-y-3 animate-in fade-in duration-300">
          {!hasAnyResult && (
            <div className="text-center py-16">
              <p className="text-gray-400 text-sm">
                No results for &ldquo;{debouncedQuery}&rdquo;
              </p>
              <p className="text-gray-300 text-xs mt-1">
                Try a country name, law title, authority abbreviation, or
                compliance area.
              </p>
            </div>
          )}

          {/* Jurisdictions */}
          {results.jurisdictions.length > 0 && (
            <ResultSection
              icon={
                <Globe2 className="h-4 w-4 text-gray-500" strokeWidth={1.5} />
              }
              title="Jurisdictions"
              count={results.totalJurisdictions}
              showAll={results.totalJurisdictions > 5}
              onShowAll={() => {
                /* could expand */
              }}
            >
              {results.jurisdictions.map(([code, law]) => (
                <button
                  key={code}
                  onClick={() => router.push(`/atlas/jurisdictions/${code}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-left group"
                >
                  <span className="text-xl leading-none shrink-0">
                    {law.flagEmoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {law.countryName}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400">
                        {code}
                      </span>
                      <StatusBadge status={law.legislation.status} />
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {law.legislation.name}
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                </button>
              ))}
            </ResultSection>
          )}

          {/* Legal Sources */}
          {results.sources.length > 0 && (
            <ResultSection
              icon={
                <Scale className="h-4 w-4 text-gray-500" strokeWidth={1.5} />
              }
              title="Legal Sources"
              count={results.totalSources}
              showAll={results.totalSources > 5}
              onShowAll={() => {
                /* could expand */
              }}
            >
              {results.sources.map((source) => (
                <button
                  key={source.id}
                  onClick={() =>
                    router.push(`/atlas/jurisdictions/${source.jurisdiction}`)
                  }
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <TypeBadge type={source.type} />
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {source.title_en}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs leading-none">
                        {JURISDICTION_FLAGS[source.jurisdiction] ||
                          source.jurisdiction}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {source.jurisdiction}
                      </span>
                      {source.official_reference && (
                        <span className="text-[10px] text-gray-300 truncate">
                          {source.official_reference}
                        </span>
                      )}
                      <RelevanceBadge level={source.relevance_level} />
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                </button>
              ))}
            </ResultSection>
          )}

          {/* Authorities */}
          {results.authorities.length > 0 && (
            <ResultSection
              icon={
                <Building2
                  className="h-4 w-4 text-gray-500"
                  strokeWidth={1.5}
                />
              }
              title="Authorities"
              count={results.totalAuthorities}
              showAll={results.totalAuthorities > 5}
              onShowAll={() => {
                /* could expand */
              }}
            >
              {results.authorities.map((auth) => (
                <button
                  key={auth.id}
                  onClick={() =>
                    router.push(`/atlas/jurisdictions/${auth.jurisdiction}`)
                  }
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-left group"
                >
                  <span className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg bg-gray-100 text-[10px] font-bold font-mono text-gray-600">
                    {auth.abbreviation.slice(0, 4)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {auth.name_en}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs leading-none">
                        {JURISDICTION_FLAGS[auth.jurisdiction] ||
                          auth.jurisdiction}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {auth.jurisdiction}
                      </span>
                      <span className="text-[10px] text-gray-400 truncate max-w-[280px]">
                        {auth.space_mandate.slice(0, 80)}
                        {auth.space_mandate.length > 80 ? "..." : ""}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                </button>
              ))}
            </ResultSection>
          )}

          {/* Compliance Areas */}
          {results.complianceAreas.length > 0 && (
            <ResultSection
              icon={
                <ShieldCheck
                  className="h-4 w-4 text-gray-500"
                  strokeWidth={1.5}
                />
              }
              title="Compliance Areas"
              count={results.totalComplianceAreas}
              showAll={results.totalComplianceAreas > 5}
              onShowAll={() => {
                /* could expand */
              }}
            >
              {results.complianceAreas.map(({ area, label, count }) => (
                <button
                  key={area}
                  onClick={() => {
                    setQuery(label);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {label}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {count} source{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                </button>
              ))}
            </ResultSection>
          )}
        </div>
      )}

      {/* ─── Legal Disclaimer ─── */}
      <footer className="mt-auto py-4 text-[9px] text-gray-400 text-center px-8 leading-relaxed">
        ATLAS is an information tool, not legal advice. Caelex assumes no
        guarantee for completeness, accuracy, or timeliness. Usage does not
        replace individual legal advice from a qualified law firm.
      </footer>
    </div>
  );
}

// ─── Sub-components (kept in same file) ─────────────────────────────

function ResultSection({
  icon,
  title,
  count,
  showAll,
  onShowAll,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  showAll: boolean;
  onShowAll: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            {title}
          </span>
          <span className="text-[10px] text-gray-400">
            {count} result{count !== 1 ? "s" : ""}
          </span>
        </div>
        {showAll && (
          <button
            onClick={onShowAll}
            className="text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            Show all
          </button>
        )}
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_BADGE[status] || STATUS_BADGE.none;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: LegalSourceType }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0 ${TYPE_BADGE_COLORS[type]}`}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}

function RelevanceBadge({ level }: { level: RelevanceLevel }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0 ${RELEVANCE_BADGE_COLORS[level]}`}
    >
      {level}
    </span>
  );
}
