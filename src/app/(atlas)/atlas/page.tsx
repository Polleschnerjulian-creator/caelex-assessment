"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Scale,
  Building2,
  Globe2,
  Sparkles,
  PlaneLanding,
  BookMarked,
  ListChecks,
  Gavel,
  Loader2,
} from "lucide-react";
import type { SemanticStatus } from "@/hooks/useAtlasSemanticSearch";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useAtlasSemanticSearch } from "@/hooks/useAtlasSemanticSearch";
// AIMode now mounted globally via AtlasShell → AIModeLauncher.
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
import type {
  LegalSource,
  LegalSourceType,
  RelevanceLevel,
  KeyProvision,
  Authority,
} from "@/data/legal-sources";
import {
  LEGAL_SOURCE_TRANSLATIONS_DE,
  AUTHORITY_TRANSLATIONS_DE,
} from "@/data/legal-sources/translations-de";
import {
  ALL_LANDING_RIGHTS_PROFILES,
  ALL_CASE_STUDIES,
  ALL_CONDUCT_CONDITIONS,
  type LandingRightsProfile,
  type CaseStudy,
  type ConductCondition,
} from "@/data/landing-rights";
import {
  ATLAS_CASES,
  getTranslatedCase,
  type LegalCase,
} from "@/data/legal-cases";
import { foldText, escapeRegex } from "@/lib/atlas/search-normalize";

// Discriminated union for the render layer. Keeps each branch's
// `entity` strongly typed so TSX narrowing via `item.kind ===` works
// without extra casts.
type HydratedSemanticItem =
  | { kind: "source"; score: number; entity: LegalSource }
  | { kind: "authority"; score: number; entity: Authority }
  | { kind: "profile"; score: number; entity: LandingRightsProfile }
  | { kind: "case-study"; score: number; entity: CaseStudy }
  | { kind: "conduct"; score: number; entity: ConductCondition };

// ─── Aggregated data ─────────────────────────────────────────────────

// ─── Search ranking ─────────────────────────────────────────────────
//
// Whole-word-aware scoring so 3–4 letter queries like "ISO", "FCC",
// "FAA", "OSHAA" don't drown in substring matches (auth/ISO/ation,
// supervISOr, provISO, etc.). Higher-tier matches always beat any
// number of lower-tier ones thanks to the wide score gaps.
//
// Language-native: all strings (title, haystack, query token) are run
// through `foldText` so diacritics, ß, and case differences don't
// silently drop matches. German translations (title, provision titles,
// scope, provision summaries) are concatenated into the source haystack
// so a native-German query like "weltraumgesetz" or "satellitenbetrieb"
// matches the BWRG even though its English title is "Space Act".

/**
 * Builds the same haystack used by performSearch for a given source.
 * Kept colocated so the snippet helper and the ranker see identical
 * text — no risk of the snippet pointing at a token the ranker didn't
 * actually score. Returns folded (lowercased, diacritic-stripped) text
 * so callers can skip redundant normalisation.
 */
function buildSourceHaystack(s: LegalSource): string {
  const en = `${s.id} ${s.title_en} ${s.title_local ?? ""} ${s.official_reference ?? ""} ${s.scope_description ?? ""} ${s.compliance_areas.join(" ")} ${s.key_provisions.map((p: KeyProvision) => `${p.title} ${p.summary}`).join(" ")}`;
  const de = LEGAL_SOURCE_TRANSLATIONS_DE.get(s.id);
  const deText = de
    ? `${de.title} ${de.scopeDescription ?? ""} ${Object.values(de.provisions)
        .map((p) => `${p.title} ${p.summary}`)
        .join(" ")}`
    : "";
  return foldText(`${en} ${deText}`);
}

// L-6: cache haystacks at module-load. Without this every keystroke
// reruns ~937 string concatenations × foldText. The id is the natural
// key — sources are static data so the cache never invalidates within
// a session. Lazy fill (rather than eager Map<id, …> at import time)
// keeps the initial bundle parse cheap.
const sourceHaystackCache = new Map<string, string>();
function getSourceHaystack(s: LegalSource): string {
  const cached = sourceHaystackCache.get(s.id);
  if (cached !== undefined) return cached;
  const built = buildSourceHaystack(s);
  sourceHaystackCache.set(s.id, built);
  return built;
}

function buildAuthorityHaystack(a: Authority): string {
  const en = `${a.id} ${a.name_en} ${a.name_local ?? ""} ${a.abbreviation ?? ""} ${a.space_mandate}`;
  const de = AUTHORITY_TRANSLATIONS_DE.get(a.id);
  const deText = de ? `${de.name} ${de.mandate}` : "";
  return foldText(`${en} ${deText}`);
}

// L-6: same cache pattern for authority haystacks.
const authorityHaystackCache = new Map<string, string>();
function getAuthorityHaystack(a: Authority): string {
  const cached = authorityHaystackCache.get(a.id);
  if (cached !== undefined) return cached;
  const built = buildAuthorityHaystack(a);
  authorityHaystackCache.set(a.id, built);
  return built;
}

/**
 * Extract a short snippet around the first match when it's outside the
 * source title. Returns null when the match is in the title or missing —
 * the row already makes those cases visually obvious. Operates on folded
 * text so the snippet match tracks the ranker exactly.
 */
function sourceMatchSnippet(
  source: LegalSource,
  query: string,
  radius = 70,
): string | null {
  const q = foldText(query.trim());
  if (!q) return null;
  const token = q.split(/\s+/)[0];
  if (!token) return null;
  if (foldText(source.title_en).includes(token)) return null;
  const haystack = getSourceHaystack(source);
  const idx = haystack.indexOf(token);
  if (idx === -1) return null;
  const start = Math.max(0, idx - radius);
  const end = Math.min(haystack.length, idx + token.length + radius);
  return `${start > 0 ? "…" : ""}${haystack.slice(start, end).trim()}${end < haystack.length ? "…" : ""}`;
}

/**
 * Score a match. `foldedTitle`, `foldedHaystack`, and `foldedToken`
 * must all have been run through `foldText` upstream — this function
 * assumes lowercase, diacritic-free input and does no normalisation
 * of its own.
 */
function scoreMatch(
  foldedTitle: string,
  foldedHaystack: string,
  foldedToken: string,
): number {
  const wordRe = new RegExp(`\\b${escapeRegex(foldedToken)}\\b`);
  const titleIdx = foldedTitle.indexOf(foldedToken);
  const titleWholeWord = wordRe.test(foldedTitle);
  if (titleWholeWord && titleIdx === 0) return 1000;
  if (titleWholeWord) return 500;
  if (titleIdx !== -1) return 100 - Math.min(titleIdx, 100);
  if (wordRe.test(foldedHaystack)) return 50;
  const hIdx = foldedHaystack.indexOf(foldedToken);
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

// M15: medium/low levels were bg-gray-300 / bg-[var(--atlas-bg-inset)] — both below
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
  cases: LegalCase[];
}

function performSearch(query: string): SearchResults | null {
  const raw = query.trim();
  if (!raw || raw.length < 2) return null;
  // q is the folded query: lowercased, NFD-decomposed, combining marks
  // stripped, ß→ss. Every haystack below is also folded before match,
  // so "weltraumgesetz" finds "Weltraumgesetz", "osterreich" finds
  // "Österreich", and "straße" finds "Strasse".
  const q = foldText(raw);

  const jurisdictions = [...JURISDICTION_DATA.entries()].filter(
    ([code, data]) =>
      foldText(data.countryName).includes(q) ||
      code.toLowerCase() === q ||
      foldText(data.legislation.name).includes(q) ||
      foldText(data.licensingAuthority.name).includes(q),
  );

  const scoredSources = ALL_SOURCES.map((s) => {
    const haystack = getSourceHaystack(s);
    return { source: s, score: scoreMatch(foldText(s.title_en), haystack, q) };
  })
    .filter(({ score }) => score > -Infinity)
    .sort((a, b) => b.score - a.score);
  const sources = scoredSources.map(({ source }) => source);

  const scoredAuthorities = ALL_AUTHORITIES.map((a) => {
    const haystack = getAuthorityHaystack(a);
    return {
      authority: a,
      score: scoreMatch(foldText(a.name_en), haystack, q),
    };
  })
    .filter(({ score }) => score > -Infinity)
    .sort((a, b) => b.score - a.score);
  const authorities = scoredAuthorities.map(({ authority }) => authority);

  const landingRightsProfiles = ALL_LANDING_RIGHTS_PROFILES.filter(
    (p) =>
      foldText(p.overview.summary).includes(q) ||
      p.regulators.some(
        (r) =>
          foldText(r.name).includes(q) || foldText(r.abbreviation).includes(q),
      ) ||
      p.jurisdiction.toLowerCase() === q,
  );

  const landingRightsCaseStudies = ALL_CASE_STUDIES.filter(
    (cs) =>
      foldText(cs.title).includes(q) ||
      foldText(cs.operator).includes(q) ||
      foldText(cs.narrative).includes(q),
  );

  const landingRightsConduct = ALL_CONDUCT_CONDITIONS.filter(
    (c) => foldText(c.title).includes(q) || foldText(c.requirement).includes(q),
  );

  // Case law search — folds title, parties, citation, jurisdiction,
  // and EN+DE translations into one haystack so a German-language
  // query matches German case captions. Sorts most-recent-first.
  const cases = ATLAS_CASES.filter((c) => {
    const trDe = getTranslatedCase(c.id, "de");
    const haystack = foldText(
      [
        c.id,
        c.title,
        c.plaintiff,
        c.defendant,
        c.forum_name,
        c.citation ?? "",
        c.jurisdiction,
        c.industry_significance,
        ...(c.parties_mentioned ?? []),
        ...c.compliance_areas,
        trDe?.title ?? "",
        trDe?.industry_significance ?? "",
      ].join(" "),
    );
    return haystack.includes(q);
  }).sort(
    (a, b) =>
      new Date(b.date_decided).getTime() - new Date(a.date_decided).getTime(),
  );

  if (
    jurisdictions.length === 0 &&
    sources.length === 0 &&
    authorities.length === 0 &&
    landingRightsProfiles.length === 0 &&
    landingRightsCaseStudies.length === 0 &&
    landingRightsConduct.length === 0 &&
    cases.length === 0
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
    cases,
  };
}

// ─── Semantic-search status badge ────────────────────────────────────
//
// Tiny pill in the homepage stats line showing whether the semantic-
// search backend is currently active for the user's query. Off when
// the env flag (ATLAS_SEMANTIC_ENABLED) isn't set; "indexing pending"
// when the corpus JSON hasn't been generated yet; "active" once a
// successful response (with or without matches) lands.
//
// Without this badge users couldn't tell whether their query simply
// had no good semantic neighbours or whether the feature was turned
// off — the section just silently disappeared.

function SemanticSearchBadge({
  status,
  tookMs,
}: {
  status: SemanticStatus;
  tookMs: number | null;
}) {
  // Only render when the badge has something useful to communicate.
  if (status === "idle") return null;
  if (status === "rate_limited" || status === "error") return null;

  if (status === "loading") {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] text-[var(--atlas-text-muted)]"
        title="Semantic search in progress"
      >
        <Loader2 size={10} className="animate-spin" strokeWidth={1.5} />
        Semantic
      </span>
    );
  }

  if (status === "ready") {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300"
        title={
          tookMs !== null
            ? `Semantic search active (${tookMs} ms)`
            : "Semantic search active"
        }
      >
        <Sparkles size={10} strokeWidth={1.5} />
        Semantic
      </span>
    );
  }

  if (status === "not_indexed") {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300"
        title="Semantic index hasn't been generated yet — exact-match search still works."
      >
        <Sparkles size={10} strokeWidth={1.5} className="opacity-50" />
        Indexing pending
      </span>
    );
  }

  // disabled — the env flag is off. Show as a subtle "off" pill so users
  // realise the section's absence is intentional, not a bug.
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] text-[var(--atlas-text-faint)]"
      title="Semantic search is off — exact-match results only."
    >
      <Sparkles size={10} strokeWidth={1.5} className="opacity-40" />
      Semantic off
    </span>
  );
}

// ─── Page ───────────────────────────────────────────────────────────

export default function CommandCenterPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  // L-7: stable reference — without useMemo this object is recreated on
  // every render, which cascades into prop-instability for downstream
  // result rows that pattern-match against TYPE_LABELS[source.type].
  const TYPE_LABELS = useMemo(() => getTypeLabels(t), [t]);
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

  // Semantic search runs in parallel to the exact-match performSearch
  // above. The hook owns its own debounce (300 ms) and cancels
  // in-flight requests on new keystrokes. Status transitions: idle →
  // loading → ready | not_indexed | rate_limited | error.
  const semantic = useAtlasSemanticSearch(query, {
    minQueryLength: 4,
    debounceMs: 300,
    limit: 12,
  });

  // Hydrate semantic match IDs ("source:INT-OST-1967") back into full
  // entities so the section can render them with the same visual
  // vocabulary as the exact-match rows. We also filter out any item
  // already shown in the exact-match list — the semantic bucket is
  // purely "what you didn't ask for directly".
  const semanticHydrated = useMemo((): HydratedSemanticItem[] => {
    if (semantic.matches.length === 0) return [];

    const exactSourceIds = new Set((results?.sources ?? []).map((s) => s.id));
    const exactAuthorityIds = new Set(
      (results?.authorities ?? []).map((a) => a.id),
    );
    // Profile jurisdictions are a narrow enum (JurisdictionCode), but the
    // semantic-match rawId arrives as a plain string. Cast to string on
    // the Set so `.has(rawId)` typechecks without forcing rawId through
    // the enum.
    const exactProfileJurisdictions = new Set<string>(
      (results?.landingRightsProfiles ?? []).map((p) => p.jurisdiction),
    );
    const exactCaseStudyIds = new Set(
      (results?.landingRightsCaseStudies ?? []).map((c) => c.id),
    );
    const exactConductIds = new Set(
      (results?.landingRightsConduct ?? []).map((c) => c.id),
    );

    const out: HydratedSemanticItem[] = [];
    for (const m of semantic.matches) {
      const [, rawId] = m.id.split(":");
      if (!rawId) continue;
      switch (m.type) {
        case "source": {
          if (exactSourceIds.has(rawId)) break;
          const s = ALL_SOURCES.find((x) => x.id === rawId);
          if (s) out.push({ kind: "source", score: m.score, entity: s });
          break;
        }
        case "authority": {
          if (exactAuthorityIds.has(rawId)) break;
          const a = ALL_AUTHORITIES.find((x) => x.id === rawId);
          if (a) out.push({ kind: "authority", score: m.score, entity: a });
          break;
        }
        case "profile": {
          if (exactProfileJurisdictions.has(rawId)) break;
          const p = ALL_LANDING_RIGHTS_PROFILES.find(
            (x) => x.jurisdiction === rawId,
          );
          if (p) out.push({ kind: "profile", score: m.score, entity: p });
          break;
        }
        case "case-study": {
          if (exactCaseStudyIds.has(rawId)) break;
          const c = ALL_CASE_STUDIES.find((x) => x.id === rawId);
          if (c) out.push({ kind: "case-study", score: m.score, entity: c });
          break;
        }
        case "conduct": {
          if (exactConductIds.has(rawId)) break;
          const c = ALL_CONDUCT_CONDITIONS.find((x) => x.id === rawId);
          if (c) out.push({ kind: "conduct", score: m.score, entity: c });
          break;
        }
      }
    }
    return out;
  }, [semantic.matches, results]);

  const hasSemanticSection = semanticHydrated.length > 0;
  const semanticLoading = semantic.status === "loading";

  const hasResults = results !== null;
  // hasAnyResults drives the layout transition (centered hero → top-
  // anchored) so the page still lifts when only the semantic bucket
  // has matches (or is about to produce some). hasResults keeps its
  // narrower meaning — "exact-match hits exist".
  const hasAnyResults = hasResults || hasSemanticSection || semanticLoading;
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
      results.landingRightsConduct.length +
      results.cases.length
    : 0;

  return (
    <div className="min-h-screen bg-[var(--atlas-bg-page)] px-8 lg:px-16">
      {/* AI Mode launcher + overlay are now mounted globally from
          AtlasShell (see AIModeLauncher.tsx), so every Atlas page —
          not just the homepage — gets the Sparkles pill. */}

      {/* ─── Centered search area ─── */}
      <div
        className={`transition-all duration-700 ease-out ${hasAnyResults ? "pt-10" : "pt-[22vh]"}`}
      >
        {/* Greeting */}
        <p
          className={`font-normal text-[var(--atlas-text-muted)] tracking-[-0.01em] transition-all duration-700 ease-out ${hasAnyResults ? "text-[15px] mb-3" : "text-[24px] lg:text-[28px] mb-8"}`}
        >
          {t(greetingKey)}
          {userName && (
            <span className="text-[var(--atlas-text-faint)]">, {userName}</span>
          )}
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
              border-0 border-b-2 border-[var(--atlas-border)] rounded-none
              outline-none ring-0 shadow-none
              focus:border-gray-900 focus:outline-none focus:ring-0 focus:shadow-none
              text-[var(--atlas-text-primary)] placeholder:text-[var(--atlas-text-faint)]
              font-light tracking-[-0.02em] leading-none
              transition-all duration-500
              ${hasAnyResults ? "text-[28px] lg:text-[36px] py-4 px-5 lg:px-6" : "text-[40px] lg:text-[52px] py-5 px-6 lg:px-8"}
            `}
            style={{ caretColor: "#111", outline: "none", boxShadow: "none" }}
          />
        </div>

        {/* Subtle stats line */}
        <div
          className={`flex items-center gap-4 transition-all duration-500 ${hasAnyResults ? "opacity-0 h-0 overflow-hidden" : "opacity-100 h-auto"}`}
        >
          <span className="text-[11px] text-[var(--atlas-text-muted)]  tracking-wide">
            {t("atlas.sources_count", { count: ALL_SOURCES.length })}
          </span>
          <span
            className="text-[4px] text-[var(--atlas-text-faint)]"
            aria-hidden="true"
          >
            &#9679;
          </span>
          <span className="text-[11px] text-[var(--atlas-text-muted)]  tracking-wide">
            {t("atlas.authorities_count", { count: ALL_AUTHORITIES.length })}
          </span>
          <span
            className="text-[4px] text-[var(--atlas-text-faint)]"
            aria-hidden="true"
          >
            &#9679;
          </span>
          <span className="text-[11px] text-[var(--atlas-text-muted)]  tracking-wide">
            {t("atlas.cases_count", { count: ATLAS_CASES.length })}
          </span>
          <span
            className="text-[4px] text-[var(--atlas-text-faint)]"
            aria-hidden="true"
          >
            &#9679;
          </span>
          <span className="text-[11px] text-[var(--atlas-text-muted)]  tracking-wide">
            {t("atlas.jurisdictions_count", { count: 19 })}
          </span>
          {/* Semantic-search status badge — visible only when the user
              is actually searching, so it doesn't clutter the empty
              landing state. ATLAS_SEMANTIC_ENABLED unset → "off"
              (subtle); enabled but unindexed → "indexing pending";
              enabled + ready → "🪄 active". */}
          {query.trim().length >= 4 && (
            <>
              <span
                className="text-[4px] text-[var(--atlas-text-faint)]"
                aria-hidden="true"
              >
                &#9679;
              </span>
              <SemanticSearchBadge
                status={semantic.status}
                tookMs={semantic.tookMs}
              />
            </>
          )}
        </div>

        {/* Result count */}
        {hasResults && (
          <div className="flex items-center gap-3 mt-1 mb-8">
            <span className="text-[11px] text-[var(--atlas-text-faint)] ">
              {totalResults === 1
                ? t("atlas.result_count_singular")
                : t("atlas.result_count", { count: totalResults })}
            </span>
            {results.jurisdictions.length > 0 && (
              <span className="text-[10px] text-[var(--atlas-text-muted)]">
                {t("atlas.jurisdictions_count", {
                  count: results.jurisdictions.length,
                })}
              </span>
            )}
            {results.sources.length > 0 && (
              <span className="text-[10px] text-[var(--atlas-text-muted)]">
                {t("atlas.sources_count", { count: results.sources.length })}
              </span>
            )}
            {results.authorities.length > 0 && (
              <span className="text-[10px] text-[var(--atlas-text-muted)]">
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
                  className="text-[var(--atlas-text-faint)]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h2 className="text-[10px] font-semibold text-[var(--atlas-text-faint)] tracking-[0.2em] uppercase">
                  {t("atlas.jurisdictions")}
                </h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {results.jurisdictions.slice(0, 6).map(([code, data]) => (
                  <button
                    key={code}
                    onClick={() => router.push(`/atlas/jurisdictions/${code}`)}
                    className="flex items-center gap-4 px-5 py-4 text-left rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)] hover:border-[var(--atlas-border-strong)] hover:shadow-sm transition-all duration-200 group"
                  >
                    <span className="text-[22px]  font-bold text-[var(--atlas-text-faint)] w-10 group-hover:text-[var(--atlas-text-muted)] transition-colors">
                      {code}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[15px] font-semibold text-[var(--atlas-text-primary)] group-hover:text-black transition-colors">
                        {JURISDICTION_NAMES[code] || data.countryName}
                      </span>
                      <span className="block text-[11px] text-[var(--atlas-text-faint)] truncate mt-0.5">
                        {data.legislation.name}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${data.legislation.status === "enacted" ? "bg-gray-900 text-white" : "bg-[var(--atlas-bg-inset)] text-[var(--atlas-text-muted)]"}`}
                    >
                      {t(`atlas.status_${data.legislation.status}`)}
                    </span>
                    <ArrowRight
                      size={14}
                      className="text-[var(--atlas-text-faint)] group-hover:text-[var(--atlas-text-primary)] transition-colors"
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
              <div className="flex items-center gap-2 mb-3">
                <Scale
                  size={13}
                  className="text-[var(--atlas-text-faint)]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h2 className="text-[10px] font-semibold text-[var(--atlas-text-faint)] tracking-[0.2em] uppercase">
                  {t("atlas.legal_sources")}
                </h2>
              </div>
              <div className="space-y-2.5">
                {(showAllSources
                  ? results.sources
                  : results.sources.slice(0, 10)
                ).map((source) => {
                  const snippet = sourceMatchSnippet(source, debouncedQuery);
                  return (
                    <button
                      key={source.id}
                      onClick={() => router.push(`/atlas/sources/${source.id}`)}
                      className="w-full flex items-start gap-5 px-6 py-4 text-left rounded-xl bg-[var(--atlas-bg-surface)] border border-transparent hover:border-[var(--atlas-border)] hover:shadow-sm transition-all duration-200 group"
                    >
                      {/* Relevance dot */}
                      <span
                        className={`h-2 w-2 mt-2 rounded-full flex-shrink-0 ${RELEVANCE_DOT[source.relevance_level]}`}
                      />

                      {/* Type */}
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--atlas-text-faint)] w-12 flex-shrink-0 mt-1">
                        {TYPE_LABELS[source.type]}
                      </span>

                      {/* Title + optional match snippet */}
                      <div className="flex-1 min-w-0">
                        <span className="text-[14px] font-medium text-[var(--atlas-text-primary)] truncate block group-hover:text-black transition-colors">
                          {getTranslatedSource(source, language).title}
                        </span>
                        {source.official_reference && (
                          <span className="text-[10px] text-[var(--atlas-text-faint)] ">
                            {source.official_reference}
                          </span>
                        )}
                        {snippet && (
                          <span className="block mt-0.5 text-[10px] italic text-[var(--atlas-text-faint)] line-clamp-2 leading-snug">
                            {snippet}
                          </span>
                        )}
                      </div>

                      {/* Jurisdiction */}
                      <span className="text-[11px]  font-bold text-[var(--atlas-text-muted)] flex-shrink-0 mt-1">
                        {source.jurisdiction}
                      </span>
                    </button>
                  );
                })}
                {!showAllSources && results.sources.length > 10 && (
                  <button
                    onClick={() => setShowAllSources(true)}
                    aria-expanded={showAllSources}
                    className="w-full py-3 text-[12px] font-medium text-[var(--atlas-text-faint)] hover:text-[var(--atlas-text-primary)] transition-colors"
                  >
                    {t("atlas.show_all", { count: results.sources.length })}
                  </button>
                )}
                {showAllSources && results.sources.length > 10 && (
                  <button
                    onClick={() => setShowAllSources(false)}
                    aria-expanded={showAllSources}
                    className="w-full py-3 text-[12px] font-medium text-[var(--atlas-text-faint)] hover:text-[var(--atlas-text-primary)] transition-colors"
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
                  className="text-[var(--atlas-text-faint)]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h2 className="text-[10px] font-semibold text-[var(--atlas-text-faint)] tracking-[0.2em] uppercase">
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
                    className="flex items-start gap-4 px-5 py-4 text-left rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)] hover:border-[var(--atlas-border-strong)] hover:shadow-sm transition-all duration-200 group"
                  >
                    <span className="text-[12px] font-bold text-[var(--atlas-text-primary)] bg-[var(--atlas-bg-inset)] rounded-md px-2 py-1 flex-shrink-0  mt-0.5">
                      {auth.abbreviation}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[14px] font-semibold text-[var(--atlas-text-primary)] group-hover:text-black transition-colors block">
                        {getTranslatedAuthority(auth, language).name}
                      </span>
                      <p className="text-[11px] text-[var(--atlas-text-faint)] mt-1 line-clamp-2 leading-relaxed">
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
                    <span className="text-[10px]  font-bold text-[var(--atlas-text-muted)] flex-shrink-0 mt-1">
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
                <PlaneLanding
                  size={13}
                  className="text-[var(--atlas-text-faint)]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h2 className="text-[10px] font-semibold text-[var(--atlas-text-faint)] tracking-[0.2em] uppercase">
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
                    className="flex items-center gap-4 px-5 py-4 text-left rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)] hover:border-[var(--atlas-border-strong)] transition"
                  >
                    <span className="text-[22px] font-bold text-[var(--atlas-text-faint)] w-10">
                      {p.jurisdiction}
                    </span>
                    <span className="text-[13px] text-[var(--atlas-text-secondary)] line-clamp-2 flex-1">
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
                <BookMarked
                  size={13}
                  className="text-[var(--atlas-text-faint)]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h2 className="text-[10px] font-semibold text-[var(--atlas-text-faint)] tracking-[0.2em] uppercase">
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
                    className="w-full flex items-center gap-4 px-5 py-3 text-left rounded-xl bg-[var(--atlas-bg-surface)] border border-transparent hover:border-[var(--atlas-border)] transition"
                  >
                    <span className="text-[11px] font-bold text-[var(--atlas-text-muted)] w-10">
                      {cs.jurisdiction}
                    </span>
                    <span className="text-[13px] font-medium text-[var(--atlas-text-primary)] flex-1">
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
                <ListChecks
                  size={13}
                  className="text-[var(--atlas-text-faint)]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h2 className="text-[10px] font-semibold text-[var(--atlas-text-faint)] tracking-[0.2em] uppercase">
                  Landing Rights — Conduct Conditions
                </h2>
              </div>
              <div className="space-y-1">
                {results.landingRightsConduct.slice(0, 10).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/atlas/landing-rights/conduct`)}
                    className="w-full flex items-center gap-4 px-5 py-3 text-left rounded-xl bg-[var(--atlas-bg-surface)] border border-transparent hover:border-[var(--atlas-border)] transition"
                  >
                    <span className="text-[11px] font-bold text-[var(--atlas-text-muted)] w-10">
                      {c.jurisdiction}
                    </span>
                    <div className="flex-1">
                      <span className="text-[13px] font-medium text-[var(--atlas-text-primary)] block">
                        {c.title}
                      </span>
                      <span className="text-[11px] text-[var(--atlas-text-muted)]">
                        {c.type.replace("_", " ")}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {results.cases.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Gavel
                  size={13}
                  className="text-[var(--atlas-text-faint)]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h2 className="text-[10px] font-semibold text-[var(--atlas-text-faint)] tracking-[0.2em] uppercase">
                  {t("atlas.cases")}
                </h2>
              </div>
              <div className="space-y-1">
                {results.cases.slice(0, 10).map((c) => {
                  const tr = getTranslatedCase(c.id, language);
                  const title = tr?.title ?? c.title;
                  const plaintiff = tr?.plaintiff ?? c.plaintiff;
                  const defendant = tr?.defendant ?? c.defendant;
                  return (
                    <button
                      key={c.id}
                      onClick={() =>
                        router.push(`/atlas/cases/${encodeURIComponent(c.id)}`)
                      }
                      className="w-full flex items-center gap-4 px-5 py-3 text-left rounded-xl bg-[var(--atlas-bg-surface)] border border-transparent hover:border-[var(--atlas-border)] transition"
                    >
                      <span className="text-[11px] font-bold text-[var(--atlas-text-muted)] w-10">
                        {c.jurisdiction}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-medium text-[var(--atlas-text-primary)] block truncate">
                          {title}
                        </span>
                        <span className="text-[11px] text-[var(--atlas-text-muted)] truncate block">
                          {plaintiff} v. {defendant}
                          {" · "}
                          {c.date_decided.slice(0, 4)}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-violet-600 dark:text-violet-400 flex-shrink-0">
                        {c.id}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ─── Ähnliche Konzepte (semantische Suche) ─── */}
      {/* Rendert parallel zu den Exact-Match-Sektionen. Leuchtet auch dann,
          wenn gar kein Exact-Treffer existiert — für natürlichsprachliche
          Queries wie "was wenn mein satellit abstürzt" ist das oft der
          einzige relevante Bucket. Bleibt still (kein Spinner-Chrom) wenn
          der Corpus nicht indiziert ist (reason:"not_indexed"). */}
      {(hasSemanticSection || semanticLoading) && (
        <div className="pb-20">
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles
                size={13}
                className="text-[var(--atlas-text-faint)]"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <h2 className="text-[10px] font-semibold text-[var(--atlas-text-faint)] tracking-[0.2em] uppercase">
                {t("atlas.similar_concepts")}
              </h2>
              {semanticLoading && (
                <span className="text-[10px] text-[var(--atlas-text-faint)] italic animate-pulse">
                  {t("atlas.semantic_searching")}
                </span>
              )}
              {!semanticLoading && semantic.tookMs !== null && (
                <span className="text-[9px] text-[var(--atlas-text-faint)]">
                  · {semantic.tookMs} ms
                </span>
              )}
            </div>
            <div className="space-y-1">
              {semanticHydrated.map((item) => {
                if (item.kind === "source") {
                  const s = item.entity;
                  return (
                    <button
                      key={`sem-source-${s.id}`}
                      onClick={() => router.push(`/atlas/sources/${s.id}`)}
                      className="w-full flex items-start gap-4 px-5 py-3.5 text-left rounded-xl bg-[var(--atlas-bg-surface)] border border-transparent hover:border-[var(--atlas-border)] hover:shadow-sm transition-all duration-200 group"
                    >
                      <span
                        className={`h-2 w-2 mt-2 rounded-full flex-shrink-0 ${RELEVANCE_DOT[s.relevance_level]}`}
                      />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--atlas-text-faint)] w-12 flex-shrink-0 mt-1">
                        {TYPE_LABELS[s.type]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[14px] font-medium text-[var(--atlas-text-primary)] truncate block group-hover:text-black transition-colors">
                          {getTranslatedSource(s, language).title}
                        </span>
                        {s.official_reference && (
                          <span className="text-[10px] text-[var(--atlas-text-faint)]">
                            {s.official_reference}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-[var(--atlas-text-muted)] flex-shrink-0 mt-1">
                        {s.jurisdiction}
                      </span>
                    </button>
                  );
                }
                if (item.kind === "authority") {
                  const a = item.entity;
                  return (
                    <button
                      key={`sem-authority-${a.id}`}
                      onClick={() =>
                        router.push(`/atlas/jurisdictions/${a.jurisdiction}`)
                      }
                      className="w-full flex items-start gap-4 px-5 py-3.5 text-left rounded-xl bg-[var(--atlas-bg-surface)] border border-transparent hover:border-[var(--atlas-border)] transition-all duration-200 group"
                    >
                      <span className="text-[12px] font-bold text-[var(--atlas-text-primary)] bg-[var(--atlas-bg-inset)] rounded-md px-2 py-1 flex-shrink-0 mt-0.5">
                        {a.abbreviation}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[14px] font-semibold text-[var(--atlas-text-primary)] block group-hover:text-black transition-colors">
                          {getTranslatedAuthority(a, language).name}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-[var(--atlas-text-muted)] flex-shrink-0 mt-1">
                        {a.jurisdiction}
                      </span>
                    </button>
                  );
                }
                if (item.kind === "profile") {
                  const p = item.entity;
                  return (
                    <button
                      key={`sem-profile-${p.jurisdiction}`}
                      onClick={() =>
                        router.push(
                          `/atlas/landing-rights/${p.jurisdiction.toLowerCase()}`,
                        )
                      }
                      className="w-full flex items-center gap-4 px-5 py-3 text-left rounded-xl bg-[var(--atlas-bg-surface)] border border-transparent hover:border-[var(--atlas-border)] transition"
                    >
                      <span className="text-[11px] font-bold text-[var(--atlas-text-muted)] w-10">
                        {p.jurisdiction}
                      </span>
                      <span className="text-[13px] text-[var(--atlas-text-secondary)] line-clamp-2 flex-1">
                        {p.overview.summary}
                      </span>
                    </button>
                  );
                }
                if (item.kind === "case-study") {
                  const c = item.entity;
                  return (
                    <button
                      key={`sem-case-${c.id}`}
                      onClick={() =>
                        router.push(
                          `/atlas/landing-rights/case-studies/${c.id}`,
                        )
                      }
                      className="w-full flex items-center gap-4 px-5 py-3 text-left rounded-xl bg-[var(--atlas-bg-surface)] border border-transparent hover:border-[var(--atlas-border)] transition"
                    >
                      <span className="text-[11px] font-bold text-[var(--atlas-text-muted)] w-10">
                        {c.jurisdiction}
                      </span>
                      <span className="text-[13px] font-medium text-[var(--atlas-text-primary)] flex-1">
                        {c.title}
                      </span>
                    </button>
                  );
                }
                if (item.kind === "conduct") {
                  const c = item.entity;
                  return (
                    <button
                      key={`sem-conduct-${c.id}`}
                      onClick={() =>
                        router.push(`/atlas/landing-rights/conduct`)
                      }
                      className="w-full flex items-center gap-4 px-5 py-3 text-left rounded-xl bg-[var(--atlas-bg-surface)] border border-transparent hover:border-[var(--atlas-border)] transition"
                    >
                      <span className="text-[11px] font-bold text-[var(--atlas-text-muted)] w-10">
                        {c.jurisdiction}
                      </span>
                      <div className="flex-1">
                        <span className="text-[13px] font-medium text-[var(--atlas-text-primary)] block">
                          {c.title}
                        </span>
                      </div>
                    </button>
                  );
                }
                return null;
              })}
            </div>
          </section>
        </div>
      )}

      {/* ─── Legal Footer ─── */}
      <footer
        className={`transition-all duration-700 ${hasAnyResults ? "mt-20" : "mt-40"} pt-8 border-t border-[var(--atlas-border-subtle)] pb-10`}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-[var(--atlas-text-faint)] tracking-wider">
              ATLAS
            </span>
            <span className="text-[9px] text-[var(--atlas-text-muted)]">
              {t("atlas.footer_by_caelex")}
            </span>
          </div>

          <div className="space-y-3 text-[10px] text-[var(--atlas-text-muted)] leading-[1.7]">
            <p>
              <span className="font-semibold text-[var(--atlas-text-muted)]">
                {t("atlas.disclaimer_no_legal_advice")}.
              </span>{" "}
              {t("atlas.disclaimer_body_no_legal_advice")}
            </p>

            <p>
              <span className="font-semibold text-[var(--atlas-text-muted)]">
                {t("atlas.disclaimer_no_guarantee")}.
              </span>{" "}
              {t("atlas.disclaimer_body_no_guarantee")}
            </p>

            <p>
              <span className="font-semibold text-[var(--atlas-text-muted)]">
                {t("atlas.disclaimer_limitation")}.
              </span>{" "}
              {t("atlas.disclaimer_body_limitation")}
            </p>

            <p>
              <span className="font-semibold text-[var(--atlas-text-muted)]">
                {t("atlas.disclaimer_data_sources")}.
              </span>{" "}
              {t("atlas.disclaimer_body_data_sources")}
            </p>

            <p>
              <span className="font-semibold text-[var(--atlas-text-muted)]">
                {t("atlas.disclaimer_ip")}.
              </span>{" "}
              {t("atlas.disclaimer_body_ip")}
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[var(--atlas-border-subtle)]">
            <span className="text-[9px] text-[var(--atlas-text-muted)]">
              © {new Date().getFullYear()} Caelex —{" "}
              {t("atlas.footer_all_rights")}
            </span>
            <div className="flex items-center gap-4">
              <a
                href="/legal/privacy"
                className="text-[9px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-secondary)] transition-colors"
              >
                {t("atlas.footer_privacy")}
              </a>
              <a
                href="/legal/terms"
                className="text-[9px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-secondary)] transition-colors"
              >
                {t("atlas.footer_terms")}
              </a>
              <a
                href="/legal/impressum"
                className="text-[9px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-secondary)] transition-colors"
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
