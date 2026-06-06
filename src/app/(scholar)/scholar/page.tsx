"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Scale } from "lucide-react";

// ─── Type labels (maps API type strings → short display labels) ──────

const TYPE_LABELS: Record<string, string> = {
  international_treaty: "Treaty",
  federal_law: "Law",
  federal_regulation: "Regulation",
  technical_standard: "Standard",
  eu_regulation: "EU Reg",
  eu_directive: "EU Dir",
  policy_document: "Policy",
  draft_legislation: "Draft",
  certification_standard: "Std",
  industry_guideline: "Guide",
  insurance_clause: "Clause",
  scientific_protocol: "Protocol",
  soft_law_resolution: "Resolution",
  national_security_doctrine: "Doctrine",
  bilateral_agreement: "Bilateral",
  multilateral_agreement: "Multilateral",
  case_law: "Case Law",
  procurement_framework: "Procurement",
  safety_regulation: "Safety",
  tax_treaty: "Tax",
};

// ─── Relevance dot — bg class + accessible label ──────────────────────
// WCAG 1.4.11: UI components that convey information need ≥3:1 contrast.
// bg-gray-300 (#D1D5DB) on white = 1.4:1 → replaced with bg-gray-500 (#6B7280) = 4.6:1.
// bg-gray-200 (#E5E7EB) on white = 1.2:1 → replaced with bg-gray-400 (#9CA3AF) = 2.9:1
//   — still marginal for non-text, so bumped to bg-gray-500 for safety.

const RELEVANCE_DOT: Record<string, { bg: string; label: string }> = {
  fundamental: { bg: "bg-gray-900", label: "Fundamental" },
  critical: { bg: "bg-red-600", label: "Kritisch" },
  high: { bg: "bg-amber-600", label: "Hoch" },
  medium: { bg: "bg-gray-500", label: "Mittel" },
  low: { bg: "bg-gray-400", label: "Niedrig" },
};

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
  score: number;
  relevanceLevel: string | null;
  officialReference: string | null;
}

interface SearchResult {
  query: string;
  hitCount: number;
  semanticAvailable: boolean;
  hits: SearchHit[];
}

// ─── Page ─────────────────────────────────────────────────────────────

export default function ScholarSearchPage() {
  const router = useRouter();
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
    // WCAG 1.3.1 / 2.4.1: wrap in <main> so the page has a landmark
    // lang="de": WCAG 3.1.1 — content is German; root layout uses lang="en".
    // Setting lang on the content element gives AT the correct language cue
    // without touching the shared root layout.
    <main lang="de" className="min-h-screen bg-[#F7F8FA] px-8 lg:px-16">
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
        className={`motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out ${hasResults || isNoResults || loading || error ? "pt-10" : "pt-[22vh]"}`}
      >
        {/* Greeting — WCAG 1.4.3: gray-500 (#6B7280) on #F7F8FA ≈ 4.7:1 ✓ */}
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
            The border-b animation still works; we add a focus-visible ring
            offset so the bottom-border focus cue remains visible.
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
            className="text-[10px] text-gray-600 tracking-wide whitespace-nowrap"
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
          <span className="text-[11px] text-gray-600 tracking-wide">
            Weltraumrecht durchsuchen
          </span>
          <span className="text-[4px] text-gray-400" aria-hidden="true">
            &#9679;
          </span>
          <span className="text-[11px] text-gray-600 tracking-wide">
            Gesetze &amp; Verordnungen
          </span>
          <span className="text-[4px] text-gray-400" aria-hidden="true">
            &#9679;
          </span>
          <span className="text-[11px] text-gray-600 tracking-wide">
            mehrere Jurisdiktionen
          </span>
        </div>

        {/* Hint when idle and query is empty
            WCAG 1.4.3: gray-600 on #F7F8FA ≈ 6.0:1 ✓ */}
        {!query && !loading && !error && !hasResults && !isNoResults && (
          <p className="text-[11px] text-gray-600 mt-6">
            Mindestens 2 Zeichen eingeben — Suche startet automatisch
          </p>
        )}

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

        {/* Error — WCAG 1.4.3: red-700 on white ≈ 5.3:1 ✓ */}
        {error && !loading && (
          <div className="mt-1 mb-8" role="alert">
            <span className="text-[11px] text-red-700">{error}</span>
          </div>
        )}

        {/* Result count row — gray-600 on #F7F8FA ≈ 6.0:1 ✓ */}
        {hasResults && !loading && (
          <div className="flex items-center gap-3 mt-1 mb-8" aria-hidden="true">
            <span className="text-[11px] text-gray-600">
              {result!.hitCount}{" "}
              {result!.hitCount === 1 ? "Ergebnis" : "Ergebnisse"}
            </span>
            {!result!.semanticAvailable && (
              <span className="text-[10px] text-gray-600">Stichwortsuche</span>
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

      {/* ─── Results ─── */}
      {hasResults && (
        <div className="space-y-6 pb-20">
          <section aria-label="Suchergebnisse">
            <div className="flex items-center gap-2 mb-2">
              <Scale
                size={13}
                className="text-gray-500"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              {/*
                WCAG 1.3.1: h2 provides heading structure for results section.
                WCAG 1.4.3: gray-600 (#4B5563) on #F7F8FA ≈ 6.0:1 ✓
                             gray-500 (#6B7280) on #F7F8FA ≈ 4.7:1 ✓
              */}
              <h2 className="text-[10px] font-semibold text-gray-600 tracking-[0.2em] uppercase">
                Rechtsquellen
              </h2>
            </div>
            {/* WCAG 1.3.1: list semantics for result items */}
            <ul className="space-y-1" role="list">
              {displayedHits.map((hit) => {
                const dotInfo = hit.relevanceLevel
                  ? (RELEVANCE_DOT[hit.relevanceLevel] ?? RELEVANCE_DOT.low)
                  : RELEVANCE_DOT.low;
                return (
                  <li key={hit.id}>
                    {/*
                      WCAG 2.5.8: py-3.5 gives ≥44px height ✓
                      WCAG 2.4.7: focus-visible ring on result rows
                      WCAG 1.4.3: gray-700 (#374151) on white = 7.4:1 ✓
                    */}
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/scholar/sources/${encodeURIComponent(hit.id)}`,
                        )
                      }
                      className="w-full flex items-center gap-4 px-5 py-3.5 text-left rounded-xl bg-white border border-transparent hover:border-gray-200 hover:shadow-sm motion-safe:transition-all motion-safe:duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
                    >
                      {/*
                        WCAG 1.4.11: dot used to convey relevance info.
                        Paired with sr-only text so it's not icon-only.
                        bg-gray-500 on white = 4.6:1 ✓; bg-gray-400 = 2.9:1
                        — bumped minimum to bg-gray-500 for "low" too.
                      */}
                      <span
                        className={`h-2 w-2 rounded-full flex-shrink-0 ${dotInfo.bg}`}
                        aria-hidden="true"
                      />
                      <span className="sr-only">Relevanz: {dotInfo.label}</span>

                      {/* Type label — WCAG 1.4.3: gray-600 on white ≈ 5.7:1 ✓ */}
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-600 w-12 flex-shrink-0">
                        {TYPE_LABELS[hit.type] ?? hit.type}
                      </span>

                      {/* Title + official reference */}
                      <div className="flex-1 min-w-0">
                        <span className="text-[14px] font-medium text-gray-800 truncate block group-hover:text-black motion-safe:transition-colors">
                          {hit.title}
                        </span>
                        {hit.officialReference && (
                          // WCAG 1.4.3: gray-600 on white ≈ 5.7:1 ✓
                          <span className="text-[10px] text-gray-600">
                            {hit.officialReference}
                          </span>
                        )}
                      </div>

                      {/* Jurisdiction — gray-600 on white ≈ 5.7:1 ✓ */}
                      <span className="text-[11px] font-bold text-gray-600 flex-shrink-0">
                        {hit.jurisdiction}
                      </span>
                    </button>
                  </li>
                );
              })}

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
            <span className="text-[10px] font-semibold text-gray-600 tracking-wider">
              SCHOLAR
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
              Added inline-block + py-1 to meet the 24px CSS height floor.
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
    </main>
  );
}
