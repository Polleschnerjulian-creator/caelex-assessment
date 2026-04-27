"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Quote, Copy, Check, X } from "lucide-react";
import type { LegalSource } from "@/data/legal-sources";
import { getTranslatedSource } from "@/data/legal-sources";
import type { Language } from "@/lib/i18n";

/**
 * Cite-this modal. Generates a copy-paste-ready citation for a legal
 * source in four canonical styles:
 *
 *   • OSCOLA — Oxford Standard for Citation of Legal Authorities
 *     (UK / Commonwealth academic writing).
 *   • Bluebook — Harvard Law Review citation guide (US).
 *   • AGLC — Australian Guide to Legal Citation.
 *   • Deutsche Zitierweise — typical German lawyer-memo format.
 *
 * Each style is rendered from the source's structured fields: jurisdiction,
 * official_reference, parliamentary_reference, un_reference, date_in_force,
 * date_last_amended. No invention — when a field is missing the line
 * collapses gracefully ("§ 3" not "§ undefined").
 *
 * The single moment Atlas crosses from "research surface" into
 * "delivered into the lawyer's Word memo." If they have to retype the
 * citation, Atlas is a search engine. If they paste it in 2 seconds,
 * Atlas is in their workflow.
 */

type CiteStyle = "oscola" | "bluebook" | "aglc" | "german";

interface CiteOption {
  id: CiteStyle;
  label: string;
  /** Short context line shown under the rendered citation. */
  hint: string;
}

const STYLES: CiteOption[] = [
  {
    id: "oscola",
    label: "OSCOLA",
    hint: "Oxford Standard for Citation of Legal Authorities (UK / Commonwealth)",
  },
  {
    id: "bluebook",
    label: "Bluebook",
    hint: "Harvard Law Review (US legal writing)",
  },
  {
    id: "aglc",
    label: "AGLC",
    hint: "Australian Guide to Legal Citation",
  },
  {
    id: "german",
    label: "Deutsche Zitierweise",
    hint: "Klassische deutsche Anwalts-Memo-Form",
  },
];

function formatYear(iso?: string): string | null {
  if (!iso) return null;
  return iso.slice(0, 4);
}

function formatDate(iso?: string, locale: "en" | "de" = "en"): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(
      locale === "de" ? "de-DE" : "en-GB",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );
  } catch {
    return iso;
  }
}

/**
 * Render the source as an OSCOLA citation. OSCOLA legislation form:
 *   "Title (Year) Reference s. Section."
 */
function renderOSCOLA(s: LegalSource): string {
  const year = formatYear(s.date_in_force ?? s.date_enacted);
  const yearPart = year ? ` ${year}` : "";
  const ref =
    s.official_reference ?? s.parliamentary_reference ?? s.un_reference ?? "";
  const refPart = ref ? ` ${ref}` : "";
  return `${s.title_en}${yearPart}${refPart}`.trim() + ".";
}

/**
 * Bluebook (T1.2 statutes). Form:
 *   "TITLE, [reference] (YEAR)."
 */
function renderBluebook(s: LegalSource): string {
  const year = formatYear(s.date_in_force ?? s.date_enacted);
  const ref =
    s.official_reference ?? s.parliamentary_reference ?? s.un_reference ?? "";
  const refPart = ref ? `, ${ref}` : "";
  const yearPart = year ? ` (${year})` : "";
  return `${s.title_en.toUpperCase()}${refPart}${yearPart}.`;
}

/**
 * AGLC (Australian Guide to Legal Citation, 4th ed.). Statutes form:
 *   "Title (Jurisdiction) Year, Reference."
 *   Bracketed jurisdiction is the AGLC convention.
 */
function renderAGLC(s: LegalSource): string {
  const year = formatYear(s.date_in_force ?? s.date_enacted);
  const yearPart = year ? ` ${year}` : "";
  const jur = s.jurisdiction !== "INT" ? ` (${s.jurisdiction})` : "";
  const ref = s.official_reference ? ` ${s.official_reference}` : "";
  return `${s.title_en}${jur}${yearPart}${ref}.`;
}

/**
 * Klassische deutsche Zitierweise. Beispiel:
 *   "Bundesweltraumgesetz (BWRG), BGBl. I 2023, S. 417, § 3"
 *
 * Wenn local-language Titel + Kurzform existieren werden sie zuerst
 * verwendet (lawyer prefers seeing the German title in a German memo).
 */
function renderGerman(s: LegalSource, translatedTitle: string): string {
  const year = formatYear(s.date_in_force ?? s.date_enacted);
  // Prefer local-language title (Bundesweltraumgesetz) over the German
  // translation of the English title — they're often identical, but
  // the local title is canonical when present.
  const title = s.title_local ?? translatedTitle ?? s.title_en;
  const ref =
    s.parliamentary_reference ?? s.official_reference ?? s.un_reference ?? "";
  const yearPart = year && !ref.includes(year) ? ` (${year})` : "";
  const refPart = ref ? `, ${ref}` : "";
  return `${title}${yearPart}${refPart}.`;
}

interface Props {
  source: LegalSource;
  language: Language;
}

export function CiteThisButton({ source, language }: Props) {
  const [open, setOpen] = useState(false);
  const [activeStyle, setActiveStyle] = useState<CiteStyle>(
    language === "de" ? "german" : "oscola",
  );
  const [copied, setCopied] = useState<CiteStyle | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const isDe = language === "de";
  const translated = useMemo(
    () => getTranslatedSource(source, language),
    [source, language],
  );

  const citations = useMemo<Record<CiteStyle, string>>(
    () => ({
      oscola: renderOSCOLA(source),
      bluebook: renderBluebook(source),
      aglc: renderAGLC(source),
      german: renderGerman(source, translated.title),
    }),
    [source, translated.title],
  );

  // Close on Escape + outside-click
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const copyCitation = async (style: CiteStyle) => {
    try {
      await navigator.clipboard.writeText(citations[style]);
      setCopied(style);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      // Clipboard can fail on iOS without a user gesture; silent fall-through.
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--atlas-text-primary)] font-medium hover:text-[var(--atlas-text-primary)] transition-colors"
        aria-label={isDe ? "Quelle zitieren" : "Cite this source"}
      >
        <Quote className="h-3.5 w-3.5" strokeWidth={1.5} />
        {isDe ? "Zitieren" : "Cite"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div
            ref={dialogRef}
            role="dialog"
            aria-labelledby="cite-this-title"
            className="w-full max-w-xl rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--atlas-border)] px-5 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <Quote className="h-4 w-4 text-emerald-600" strokeWidth={1.5} />
                <h2
                  id="cite-this-title"
                  className="text-[14px] font-semibold text-[var(--atlas-text-primary)] truncate"
                >
                  {isDe ? "Quelle zitieren" : "Cite this source"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={isDe ? "Schließen" : "Close"}
                className="flex h-7 w-7 items-center justify-center rounded text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] hover:bg-[var(--atlas-bg-surface-muted)] transition-colors"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Style picker — radio-tabs */}
            <div className="flex flex-wrap gap-1 px-5 pt-3">
              {STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setActiveStyle(style.id)}
                  className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                    activeStyle === style.id
                      ? "bg-[var(--atlas-bg-inset)] text-[var(--atlas-text-primary)]"
                      : "text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)]"
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>

            <div className="px-5 pt-1 pb-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--atlas-text-faint)] mt-3 mb-2">
                {STYLES.find((s) => s.id === activeStyle)?.hint}
              </p>

              {/* Active style — large + copy button */}
              <div className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface-muted)] p-4 mb-4">
                <p className="text-[13px] leading-relaxed text-[var(--atlas-text-primary)] font-serif">
                  {citations[activeStyle]}
                </p>
              </div>

              <button
                type="button"
                onClick={() => copyCitation(activeStyle)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#0f0f12] hover:bg-[#1a1a1f] text-white text-[12px] font-medium tracking-wide px-4 py-2.5 transition-colors"
              >
                {copied === activeStyle ? (
                  <>
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                    {isDe ? "Kopiert" : "Copied"}
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {isDe ? "In Zwischenablage kopieren" : "Copy to clipboard"}
                  </>
                )}
              </button>

              {/* All styles compact preview — lawyers often need to
                  paste two formats (German memo + English appendix). */}
              <div className="mt-5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--atlas-text-faint)] mb-2">
                  {isDe ? "Alle Stile" : "All styles"}
                </p>
                <div className="space-y-1.5">
                  {STYLES.filter((s) => s.id !== activeStyle).map((style) => (
                    <div
                      key={style.id}
                      className="group flex items-start gap-2 rounded-md border border-[var(--atlas-border-subtle)] hover:border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] px-3 py-2 transition-colors"
                    >
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--atlas-text-muted)] flex-shrink-0 mt-0.5 w-16">
                        {style.label}
                      </span>
                      <p className="text-[11.5px] leading-relaxed text-[var(--atlas-text-secondary)] font-serif flex-1 min-w-0 truncate">
                        {citations[style.id]}
                      </p>
                      <button
                        type="button"
                        onClick={() => copyCitation(style.id)}
                        aria-label={
                          isDe
                            ? `${style.label} kopieren`
                            : `Copy ${style.label}`
                        }
                        className="flex h-6 w-6 items-center justify-center rounded text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {copied === style.id ? (
                          <Check
                            className="h-3 w-3 text-emerald-600"
                            strokeWidth={2}
                          />
                        ) : (
                          <Copy className="h-3 w-3" strokeWidth={1.5} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer — last-amended hint and source-id reminder */}
              <p className="mt-4 text-[10px] text-[var(--atlas-text-faint)]">
                ATLAS-ID:{" "}
                <span className="font-mono text-[var(--atlas-text-muted)]">
                  {source.id}
                </span>
                {source.date_last_amended &&
                  ` · ${isDe ? "Zuletzt geändert" : "Last amended"}: ${formatDate(source.date_last_amended, isDe ? "de" : "en")}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
