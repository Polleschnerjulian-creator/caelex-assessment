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

// ─── Relevance dot (maps relevance_level → Tailwind bg class) ────────

const RELEVANCE_DOT: Record<string, string> = {
  fundamental: "bg-gray-900",
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-gray-300",
  low: "bg-gray-200",
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

  return (
    <div className="min-h-screen bg-[#F7F8FA] px-8 lg:px-16">
      {/* ─── Centered search area ─── */}
      <div
        className={`transition-all duration-700 ease-out ${hasResults || isNoResults || loading || error ? "pt-10" : "pt-[22vh]"}`}
      >
        {/* Greeting */}
        <p
          className={`font-normal text-gray-500 tracking-[-0.01em] transition-all duration-700 ease-out ${hasResults || isNoResults || loading || error ? "text-[15px] mb-3" : "text-[24px] lg:text-[28px] mb-8"}`}
        >
          {greeting}
        </p>

        {/* Search Input */}
        <div className="relative mb-3">
          <input
            ref={inputRef}
            type="text"
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
              focus:border-gray-900 focus:outline-none focus:ring-0 focus:shadow-none
              text-gray-900 placeholder:text-gray-300
              font-light tracking-[-0.02em] leading-none
              transition-all duration-500
              ${hasResults || isNoResults || loading || error ? "text-[28px] lg:text-[36px] py-4" : "text-[40px] lg:text-[52px] py-5"}
            `}
            style={{ caretColor: "#111", outline: "none", boxShadow: "none" }}
          />
        </div>

        {/* Jurisdiction filter — subtle inline */}
        <div
          className={`flex items-center gap-3 transition-all duration-300 ${hasResults || isNoResults || loading || error ? "mb-4" : "mb-0"}`}
        >
          <span className="text-[10px] text-gray-400 tracking-wide whitespace-nowrap">
            Jurisdiction:
          </span>
          <input
            type="text"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
            placeholder="z.B. DE, EU, FR …"
            className="bg-transparent border-0 border-b border-gray-200 outline-none text-[12px] text-gray-500 placeholder:text-gray-300 focus:border-gray-400 transition-colors w-24 pb-0.5"
            style={{ outline: "none", boxShadow: "none" }}
          />
        </div>

        {/* Subtle stats line — only shown when idle */}
        <div
          className={`flex items-center gap-4 transition-all duration-500 ${hasResults || isNoResults || loading || error ? "opacity-0 h-0 overflow-hidden" : "opacity-100 h-auto mt-4"}`}
        >
          <span className="text-[11px] text-gray-500 tracking-wide">
            Weltraumrecht durchsuchen
          </span>
          <span className="text-[4px] text-gray-400" aria-hidden="true">
            &#9679;
          </span>
          <span className="text-[11px] text-gray-500 tracking-wide">
            Gesetze &amp; Verordnungen
          </span>
          <span className="text-[4px] text-gray-400" aria-hidden="true">
            &#9679;
          </span>
          <span className="text-[11px] text-gray-500 tracking-wide">
            mehrere Jurisdiktionen
          </span>
        </div>

        {/* Hint when idle and query is empty */}
        {!query && !loading && !error && !hasResults && !isNoResults && (
          <p className="text-[11px] text-gray-400 mt-6">
            Mindestens 2 Zeichen eingeben — Suche startet automatisch
          </p>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center gap-2 mt-1 mb-8">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-300 animate-pulse" />
            <span className="text-[11px] text-gray-400">
              Durchsuche Rechtsquellen…
            </span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="mt-1 mb-8">
            <span className="text-[11px] text-red-400">{error}</span>
          </div>
        )}

        {/* Result count row */}
        {hasResults && !loading && (
          <div className="flex items-center gap-3 mt-1 mb-8">
            <span className="text-[11px] text-gray-400">
              {result!.hitCount}{" "}
              {result!.hitCount === 1 ? "Ergebnis" : "Ergebnisse"}
            </span>
            {!result!.semanticAvailable && (
              <span className="text-[10px] text-gray-400">Stichwortsuche</span>
            )}
          </div>
        )}

        {/* No results */}
        {isNoResults && (
          <div className="mt-1 mb-8">
            <span className="text-[11px] text-gray-400">
              Keine Treffer für &ldquo;{result!.query}&rdquo; — andere
              Suchbegriffe oder Jurisdiction versuchen.
            </span>
          </div>
        )}
      </div>

      {/* ─── Results ─── */}
      {hasResults && (
        <div className="space-y-6 pb-20">
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Scale
                size={13}
                className="text-gray-300"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <h2 className="text-[10px] font-semibold text-gray-400 tracking-[0.2em] uppercase">
                Rechtsquellen
              </h2>
            </div>
            <div className="space-y-1">
              {displayedHits.map((hit) => (
                <button
                  key={hit.id}
                  onClick={() =>
                    router.push(
                      `/scholar/sources/${encodeURIComponent(hit.id)}`,
                    )
                  }
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-left rounded-xl bg-white border border-transparent hover:border-gray-200 hover:shadow-sm transition-all duration-200 group"
                >
                  {/* Relevance dot */}
                  <span
                    className={`h-2 w-2 rounded-full flex-shrink-0 ${hit.relevanceLevel ? (RELEVANCE_DOT[hit.relevanceLevel] ?? "bg-gray-200") : "bg-gray-200"}`}
                  />

                  {/* Type label */}
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 w-12 flex-shrink-0">
                    {TYPE_LABELS[hit.type] ?? hit.type}
                  </span>

                  {/* Title + official reference */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[14px] font-medium text-gray-800 truncate block group-hover:text-black transition-colors">
                      {hit.title}
                    </span>
                    {hit.officialReference && (
                      <span className="text-[10px] text-gray-400">
                        {hit.officialReference}
                      </span>
                    )}
                  </div>

                  {/* Jurisdiction */}
                  <span className="text-[11px] font-bold text-gray-500 flex-shrink-0">
                    {hit.jurisdiction}
                  </span>
                </button>
              ))}

              {/* Show-all / less toggle */}
              {!showAll && result!.hits.length > 10 && (
                <button
                  onClick={() => setShowAll(true)}
                  aria-expanded={false}
                  className="w-full py-3 text-[12px] font-medium text-gray-400 hover:text-gray-900 transition-colors"
                >
                  Alle {result!.hits.length} anzeigen
                </button>
              )}
              {showAll && result!.hits.length > 10 && (
                <button
                  onClick={() => setShowAll(false)}
                  aria-expanded={true}
                  className="w-full py-3 text-[12px] font-medium text-gray-400 hover:text-gray-900 transition-colors"
                >
                  Weniger anzeigen
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ─── Legal Footer ─── */}
      <footer
        className={`transition-all duration-700 ${hasResults ? "mt-20" : "mt-40"} pt-8 border-t border-gray-100 pb-10`}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-gray-400 tracking-wider">
              SCHOLAR
            </span>
            <span className="text-[9px] text-gray-500">by Caelex</span>
          </div>

          <div className="space-y-3 text-[10px] text-gray-500 leading-[1.7]">
            <p>
              <span className="font-semibold text-gray-500">
                Kein Rechtsrat.
              </span>{" "}
              Caelex Scholar ist ein Recherche- und Informationswerkzeug. Die
              bereitgestellten Informationen, Daten und Analysen stellen keine
              Rechts-, Compliance- oder sonstige professionelle Beratung dar.
              Nutzer müssen alle Informationen eigenständig verifizieren und
              qualifizierte Rechtsberatung hinzuziehen.
            </p>

            <p>
              <span className="font-semibold text-gray-500">Keine Gewähr.</span>{" "}
              Caelex übernimmt keine Gewähr für Richtigkeit, Vollständigkeit
              oder Aktualität der Daten. Regulatorische Rahmenbedingungen können
              sich ohne Vorankündigung ändern.
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-[9px] text-gray-500">
              © {new Date().getFullYear()} Caelex — Alle Rechte vorbehalten
            </span>
            <div className="flex items-center gap-4">
              <a
                href="/legal/privacy"
                className="text-[9px] text-gray-500 hover:text-gray-600 transition-colors"
              >
                Datenschutz
              </a>
              <a
                href="/legal/terms"
                className="text-[9px] text-gray-500 hover:text-gray-600 transition-colors"
              >
                AGB
              </a>
              <a
                href="/legal/impressum"
                className="text-[9px] text-gray-500 hover:text-gray-600 transition-colors"
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
