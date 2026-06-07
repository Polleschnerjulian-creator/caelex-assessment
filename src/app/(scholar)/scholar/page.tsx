"use client";

import { useState, useRef, useEffect, Fragment, type ReactNode } from "react";
import Link from "next/link";
import { Globe2, BookOpen, Scale, AlertCircle } from "lucide-react";
import { ScholarPage } from "./_components/ScholarPage";
import { Eyebrow } from "./_components/Eyebrow";
import { RelevanceGlyph } from "./_components/RelevanceGlyph";
import { SCHOLAR_TYPE } from "./_components/scholar-type";

// ─── German source-type labels (Eyebrow kicker per row) ──────────────
// Monochrome eyebrow text only — no colour. Falls back to the raw type
// string for any code not mapped here.
const TYPE_LABELS_DE: Record<string, string> = {
  international_treaty: "Vertrag",
  federal_law: "Gesetz",
  federal_regulation: "Verordnung",
  technical_standard: "Standard",
  eu_regulation: "EU-Verordnung",
  eu_directive: "EU-Richtlinie",
  policy_document: "Leitlinie",
  draft_legislation: "Entwurf",
  certification_standard: "Zertifizierung",
  industry_guideline: "Leitfaden",
  insurance_clause: "Klausel",
  scientific_protocol: "Protokoll",
  soft_law_resolution: "Resolution",
  national_security_doctrine: "Doktrin",
  bilateral_agreement: "Bilateral",
  multilateral_agreement: "Multilateral",
  case_law: "Rechtsprechung",
  procurement_framework: "Vergabe",
  safety_regulation: "Sicherheit",
  tax_treaty: "Steuer",
};

// ─── Safe matched-term highlighter ───────────────────────────────────
// Splits plain text on the query tokens and wraps matches in a monochrome
// emphasis span (weight + subtle gray bg — NEVER colour). Operates on the
// raw string only (no HTML parsing / no dangerouslySetInnerHTML), so it
// cannot break markup or inject anything.

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Build a single case-insensitive regex from the query's word tokens
// (≥2 chars, deduped, longest-first so multi-word matches win over their
// substrings). Returns null when there is nothing meaningful to match.
function buildHighlightRegex(query: string): RegExp | null {
  const tokens = Array.from(
    new Set(
      query
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length >= 2),
    ),
  ).sort((a, b) => b.length - a.length);
  if (tokens.length === 0) return null;
  return new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "gi");
}

function highlightMatches(text: string, regex: RegExp | null): ReactNode {
  if (!regex || !text) return text;
  // String.split with a capturing group keeps the delimiters; odd indices
  // are the matched fragments.
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  // A <span> (not <mark>) is used deliberately: <mark>'s user-agent and
  // forced-colors styling can introduce a non-gray hue (yellow / system
  // Mark colour), which would violate the strict-monochrome mandate. Weight
  // + a subtle gray background carry the emphasis with zero colour.
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span
        key={i}
        className="bg-gray-100 text-gray-900 font-semibold rounded px-0.5"
      >
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

// ─── German greeting by hour ─────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Guten Abend";
  if (hour < 12) return "Guten Morgen";
  if (hour < 17) return "Guten Tag";
  return "Guten Abend";
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

// ─── API result shape ────────────────────────────────────────────────

interface SearchHit {
  id: string;
  jurisdiction: string;
  type: string;
  status: string;
  title: string;
  scopeDescription: string | null;
  snippet: string | null;
  score: number;
  keywordScore: number | null;
  semanticScore: number | null;
  relevanceLevel: string | null;
  officialReference: string | null;
}

interface SearchResult {
  query: string;
  hitCount: number;
  semanticAvailable: boolean;
  hits: SearchHit[];
}

// ─── Example chips for empty state ──────────────────────────────────

const EXAMPLE_CHIPS = [
  "Weltraumvertrag",
  "NIS2-Richtlinie",
  "EU Space Act",
  "Vermeidung von Weltraummüll",
  "Startgenehmigung",
  "ITAR-Vorschriften",
];

// ─── Entry cards for empty state navigation ──────────────────────────

const ENTRY_CARDS = [
  {
    href: "/scholar/jurisdictions",
    icon: Globe2,
    label: "Jurisdiktionen",
    description: "Rechtsquellen nach Land oder Region",
  },
  {
    href: "/scholar/library",
    icon: BookOpen,
    label: "Bibliothek",
    description: "Alle Quellen filtern und durchsuchen",
  },
  {
    href: "/scholar/cases",
    icon: Scale,
    label: "Rechtsprechung",
    description: "Urteile und Durchsetzungsmaßnahmen",
  },
];

// ─── Scannable search-result row ─────────────────────────────────────
// Each hit is a link to /scholar/sources/[id]. Layout is built for fast
// scanning: relevance glyph · type eyebrow · title (matched terms in
// weight + subtle gray) · jurisdiction · identifier (mono) · 2-line
// snippet. STRICTLY MONOCHROME — black / white / gray only.

function SearchResultRow({
  hit,
  highlight,
}: {
  hit: SearchHit;
  highlight: RegExp | null;
}) {
  const typeLabel = TYPE_LABELS_DE[hit.type] ?? hit.type;
  const snippet = hit.snippet ?? hit.scopeDescription;

  return (
    <Link
      href={"/scholar/sources/" + encodeURIComponent(hit.id)}
      className="flex items-start gap-4 px-5 py-3.5 rounded-2xl bg-white border border-transparent hover:border-gray-200/70 hover:shadow-sm motion-safe:transition-all motion-safe:duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
    >
      {/* Relevance — monochrome bars + sr-only label (WCAG 1.4.1 / 1.4.11).
          Rendered only when a relevance level exists. */}
      {hit.relevanceLevel && (
        <RelevanceGlyph level={hit.relevanceLevel} className="mt-1" />
      )}

      {/* Type eyebrow — shared monochrome token (text-micro, gray-500) */}
      <Eyebrow className="w-20 flex-shrink-0 mt-1 truncate">
        {typeLabel}
      </Eyebrow>

      {/* Title + identifier + snippet */}
      <div className="flex-1 min-w-0">
        {/* h3 keeps the doc-title → result hierarchy under the section h2 */}
        <h3 className="text-body-lg font-medium text-gray-900 leading-snug line-clamp-2 group-hover:text-black motion-safe:transition-colors">
          {highlightMatches(hit.title, highlight)}
        </h3>

        {/* Identifier (mono) — only when present */}
        {hit.officialReference && (
          <span className={`${SCHOLAR_TYPE.mono} truncate block mt-0.5`}>
            {hit.officialReference}
          </span>
        )}

        {/* Snippet — 2-line clamp, matched terms emphasised */}
        {snippet && (
          <p
            className={`${SCHOLAR_TYPE.meta} leading-normal line-clamp-2 mt-1`}
          >
            {highlightMatches(snippet, highlight)}
          </p>
        )}
      </div>

      {/* Jurisdiction — meta token, bold for the short code */}
      <span className={`${SCHOLAR_TYPE.meta} font-bold flex-shrink-0 mt-1`}>
        {hit.jurisdiction}
      </span>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

export default function ScholarSearchPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);

  const [greeting] = useState(getGreeting);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Reset show-all when query changes
  useEffect(() => {
    setShowAll(false);
  }, [debouncedQuery]);

  // Trigger search on debounced query change
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setResult(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const body: Record<string, string> = { query: trimmed };
    if (jurisdiction.trim()) body.jurisdiction = jurisdiction.trim();

    fetch("/api/scholar/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(
            (data as { error?: string }).error ??
              "Die Suche ist fehlgeschlagen. Bitte versuche es erneut.",
          );
          setResult(null);
          return;
        }
        const data: SearchResult = await res.json();
        setResult(data);
      })
      .catch(() => {
        if (!cancelled)
          setError("Netzwerkfehler. Bitte prüfe deine Verbindung.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, jurisdiction]);

  // Cmd+K / Ctrl+K to focus; Escape to clear
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

  const hasResults = result !== null && result.hits.length > 0;
  const isNoResults =
    result !== null && result.hits.length === 0 && !loading && !error;
  const displayedHits = hasResults
    ? showAll
      ? result.hits
      : result.hits.slice(0, 10)
    : [];

  // Matched-term highlighter, built from the query the results belong to
  // (not the live input) so emphasis stays in sync with displayed hits.
  const highlightRegex = result ? buildHighlightRegex(result.query) : null;

  // Whether to show the empty-state below the search box
  const isIdle = !query && !loading && !error && !hasResults && !isNoResults;

  // WCAG 4.1.3: live region text summarises current search state
  const liveText = loading
    ? "Durchsuche Rechtsquellen…"
    : error
      ? error
      : isNoResults
        ? `Keine Treffer für ${result!.query}.`
        : hasResults
          ? `${result!.hitCount} ${result!.hitCount === 1 ? "Ergebnis" : "Ergebnisse"} gefunden.`
          : "";

  return (
    // ScholarPage provides the max-w-6xl container + <main lang="de">
    <ScholarPage>
      {/* WCAG 2.4.6 / 1.3.1: visually-hidden page title */}
      <h1 className="sr-only">Caelex Scholar — Rechtsquellen durchsuchen</h1>

      {/* WCAG 4.1.3: aria-live region for status messages */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveText}
      </div>

      {/* ─── Centered search area ─── */}
      <div
        className={`motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out ${hasResults || isNoResults || loading || error ? "pt-4" : "pt-[18vh]"}`}
      >
        {/* Greeting — WCAG 1.4.3: gray-600 (#4B5563) on #F7F8FA ≈ 6.0:1 ✓ */}
        <p
          className={`font-normal text-gray-600 tracking-[-0.01em] motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out ${hasResults || isNoResults || loading || error ? "text-[15px] mb-3" : "text-[24px] lg:text-[28px] mb-8"}`}
        >
          {greeting}
        </p>

        {/* Search Input */}
        <div className="relative mb-3">
          {/*
            WCAG 1.3.1 / 3.3.2: aria-label provides programmatic label.
            WCAG 2.4.7: focus-visible ring replaces the outline:none style.
          */}
          <label htmlFor="scholar-search" className="sr-only">
            Rechtsquellen durchsuchen
          </label>
          <input
            ref={inputRef}
            id="scholar-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechtsquellen, Gesetze, Verordnungen durchsuchen …"
            aria-label="Rechtsquellen durchsuchen"
            spellCheck={false}
            autoComplete="off"
            className={`
              w-full bg-transparent
              border-0 border-b-2 border-gray-200 rounded-none
              outline-none ring-0 shadow-none
              focus-visible:border-gray-900 focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]
              text-gray-900
              placeholder:text-gray-500
              font-light tracking-[-0.02em] leading-none
              motion-safe:transition-all motion-safe:duration-500
              ${hasResults || isNoResults || loading || error ? "text-[28px] lg:text-[36px] py-4" : "text-[40px] lg:text-[52px] py-5"}
            `}
            style={{ caretColor: "#111", boxShadow: "none" }}
          />
        </div>

        {/* Jurisdiction filter */}
        <div
          className={`flex items-center gap-3 motion-safe:transition-all motion-safe:duration-300 ${hasResults || isNoResults || loading || error ? "mb-4" : "mb-0"}`}
        >
          {/*
            WCAG 1.3.1 / 3.3.2: visible label via <label> + sr-only pairing.
            WCAG 1.4.3: gray-600 (#4B5563) on #F7F8FA ≈ 6.0:1 ✓
          */}
          <label
            htmlFor="scholar-jurisdiction"
            className="text-[11px] text-gray-600 tracking-[-0.01em] whitespace-nowrap"
          >
            Jurisdiction:
          </label>
          <input
            id="scholar-jurisdiction"
            type="text"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
            placeholder="z.B. DE, EU, FR …"
            className="bg-transparent border-0 border-b border-gray-300 outline-none text-[12px] text-gray-600 placeholder:text-gray-500 focus-visible:border-gray-700 focus-visible:ring-1 focus-visible:ring-gray-700 focus-visible:ring-offset-1 focus-visible:ring-offset-[#F7F8FA] transition-colors w-24 pb-0.5"
            style={{ boxShadow: "none" }}
          />
        </div>

        {/* Subtle stats line — only shown when idle
            WCAG 1.4.3: gray-600 (#4B5563) on #F7F8FA ≈ 6.0:1 ✓ */}
        <div
          aria-hidden="true"
          className={`flex items-center gap-4 motion-safe:transition-all motion-safe:duration-500 ${hasResults || isNoResults || loading || error ? "opacity-0 h-0 overflow-hidden" : "opacity-100 h-auto mt-4"}`}
        >
          <span className="text-[11px] text-gray-500 tracking-[-0.01em]">
            Weltraumrecht durchsuchen
          </span>
          <span className="text-[4px] text-gray-400" aria-hidden="true">
            &#9679;
          </span>
          <span className="text-[11px] text-gray-500 tracking-[-0.01em]">
            Gesetze &amp; Verordnungen
          </span>
          <span className="text-[4px] text-gray-400" aria-hidden="true">
            &#9679;
          </span>
          <span className="text-[11px] text-gray-500 tracking-[-0.01em]">
            mehrere Jurisdiktionen
          </span>
        </div>

        {/* Loading indicator
            WCAG 1.4.3: gray-600 on #F7F8FA ≈ 6.0:1 ✓ */}
        {loading && (
          <div className="flex items-center gap-2 mt-1 mb-8" aria-hidden="true">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-500 motion-safe:animate-pulse" />
            <span className="text-[11px] text-gray-600">
              Durchsuche Rechtsquellen…
            </span>
          </div>
        )}

        {/* Error — monochrome. WCAG 1.4.3: gray-900 message ≈ 15:1, gray-500 glyph ≈ 4.6:1 ✓ */}
        {error && !loading && (
          <div
            className="mt-1 mb-8 flex items-center gap-2 border border-gray-200 bg-gray-50 rounded-lg px-3 py-2"
            role="alert"
          >
            <AlertCircle
              size={14}
              className="text-gray-500 flex-shrink-0"
              aria-hidden
            />
            <span className={`${SCHOLAR_TYPE.meta} text-gray-900`}>
              {error}
            </span>
          </div>
        )}

        {/* Result count row — gray-600 on #F7F8FA ≈ 6.0:1 ✓ */}
        {hasResults && !loading && (
          <div className="flex items-center gap-3 mt-1 mb-8" aria-hidden="true">
            <span className={SCHOLAR_TYPE.meta}>
              {result!.hitCount}{" "}
              {result!.hitCount === 1 ? "Ergebnis" : "Ergebnisse"}
            </span>
            {/* Search-mode signal — quiet monochrome note (spec §2e) */}
            {result!.semanticAvailable ? (
              <span className={SCHOLAR_TYPE.meta}>Semantische Suche aktiv</span>
            ) : (
              <span className={SCHOLAR_TYPE.meta}>Stichwortsuche</span>
            )}
          </div>
        )}

        {/* No results — gray-600 on #F7F8FA ≈ 6.0:1 ✓ */}
        {isNoResults && (
          <div className="mt-1 mb-8" aria-hidden="true">
            <span className="text-[11px] text-gray-600">
              Keine Treffer für &ldquo;{result!.query}&rdquo; — andere
              Suchbegriffe oder Jurisdiction versuchen.
            </span>
          </div>
        )}
      </div>

      {/* ─── Empty state: chips + entry cards ─── */}
      {isIdle && (
        <div className="mt-10 space-y-8">
          {/* Example search chips */}
          <div>
            <p className="text-[13px] font-semibold text-gray-900 tracking-[-0.01em] mb-3">
              Beispielsuchen
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setQuery(chip);
                    inputRef.current?.focus();
                  }}
                  className="text-[12px] text-gray-700 bg-white border border-gray-200 rounded-full px-3.5 py-1.5 hover:border-gray-400 hover:text-gray-900 motion-safe:transition-all motion-safe:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Entry cards — Jurisdictions / Library / Cases */}
          <div>
            <p className="text-[13px] font-semibold text-gray-900 tracking-[-0.01em] mb-3">
              Erkunden
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ENTRY_CARDS.map(({ href, icon: Icon, label, description }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-start gap-3 bg-white border border-gray-200/70 rounded-2xl p-5 hover:border-gray-300 hover:shadow-sm motion-safe:transition-all motion-safe:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
                >
                  <Icon
                    size={16}
                    className="text-gray-400 mt-0.5 flex-shrink-0 group-hover:text-gray-600 motion-safe:transition-colors"
                    strokeWidth={1.5}
                    aria-hidden={true}
                  />
                  <div className="min-w-0">
                    <span className="block text-[13px] font-medium text-gray-800 group-hover:text-black motion-safe:transition-colors">
                      {label}
                    </span>
                    <span className="block text-[11px] text-gray-500 mt-0.5">
                      {description}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Results ─── */}
      {hasResults && (
        <div className="space-y-6 pb-20">
          <section aria-label="Suchergebnisse">
            <div className="flex items-center gap-2 mb-2">
              <Scale
                size={13}
                className="text-gray-500"
                strokeWidth={1.5}
                aria-hidden={true}
              />
              {/*
                WCAG 1.3.1: h2 provides heading structure for results section.
                Section label uses the shared monochrome eyebrow token
                (text-micro, gray-500) — no ad-hoc px size.
              */}
              <h2 className={SCHOLAR_TYPE.eyebrow}>Rechtsquellen</h2>
            </div>
            {/* WCAG 1.3.1: list semantics for result items */}
            <ul className="space-y-1" role="list">
              {displayedHits.map((hit) => (
                <li key={hit.id}>
                  <SearchResultRow hit={hit} highlight={highlightRegex} />
                </li>
              ))}

              {/* Show-all / less toggle
                  WCAG 2.5.8: py-3 → at least 44px height with the text ✓
                  WCAG 2.4.7: focus-visible ring
                  WCAG 1.4.3: gray-600 on #F7F8FA ≈ 6.0:1 ✓ */}
              {!showAll && result!.hits.length > 10 && (
                <li>
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    aria-expanded={false}
                    aria-controls="scholar-results"
                    className="w-full py-3 text-[12px] font-medium text-gray-600 hover:text-gray-900 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] rounded"
                  >
                    Alle {result!.hits.length} anzeigen
                  </button>
                </li>
              )}
              {showAll && result!.hits.length > 10 && (
                <li>
                  <button
                    type="button"
                    onClick={() => setShowAll(false)}
                    aria-expanded={true}
                    aria-controls="scholar-results"
                    className="w-full py-3 text-[12px] font-medium text-gray-600 hover:text-gray-900 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] rounded"
                  >
                    Weniger anzeigen
                  </button>
                </li>
              )}
            </ul>
          </section>
        </div>
      )}

      {/* ─── Legal Footer ─── */}
      <footer
        className={`motion-safe:transition-all motion-safe:duration-700 ${hasResults ? "mt-20" : "mt-40"} pt-8 border-t border-gray-100 pb-10`}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {/* WCAG 1.4.3: gray-600 on white ≈ 5.7:1 ✓ */}
            <span className="text-[10px] font-semibold text-gray-600 tracking-[-0.01em]">
              Scholar
            </span>
            <span className="text-[9px] text-gray-600">by Caelex</span>
          </div>

          {/* WCAG 1.4.3: gray-600 on white ≈ 5.7:1 ✓ */}
          <div className="space-y-3 text-[10px] text-gray-600 leading-[1.7]">
            <p>
              <span className="font-semibold text-gray-700">
                Kein Rechtsrat.
              </span>{" "}
              Caelex Scholar ist ein Recherche- und Informationswerkzeug. Die
              bereitgestellten Informationen, Daten und Analysen stellen keine
              Rechts-, Compliance- oder sonstige professionelle Beratung dar.
              Nutzer müssen alle Informationen eigenständig verifizieren und
              qualifizierte Rechtsberatung hinzuziehen.
            </p>

            <p>
              <span className="font-semibold text-gray-700">Keine Gewähr.</span>{" "}
              Caelex übernimmt keine Gewähr für Richtigkeit, Vollständigkeit
              oder Aktualität der Daten. Regulatorische Rahmenbedingungen können
              sich ohne Vorankündigung ändern.
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-[9px] text-gray-600">
              © {new Date().getFullYear()} Caelex — Alle Rechte vorbehalten
            </span>
            {/*
              WCAG 2.5.8: footer links need ≥24px targets.
              WCAG 2.4.7: focus-visible ring on footer links.
              WCAG 1.4.3: gray-700 (#374151) on white = 7.4:1 ✓
            */}
            <nav aria-label="Rechtliche Links">
              <ul className="flex items-center gap-4 list-none">
                <li>
                  <a
                    href="/legal/privacy"
                    className="inline-block py-1 text-[9px] text-gray-700 hover:text-gray-900 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 rounded"
                  >
                    Datenschutz
                  </a>
                </li>
                <li>
                  <a
                    href="/legal/terms"
                    className="inline-block py-1 text-[9px] text-gray-700 hover:text-gray-900 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 rounded"
                  >
                    AGB
                  </a>
                </li>
                <li>
                  <a
                    href="/legal/impressum"
                    className="inline-block py-1 text-[9px] text-gray-700 hover:text-gray-900 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 rounded"
                  >
                    Impressum
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </footer>
    </ScholarPage>
  );
}
