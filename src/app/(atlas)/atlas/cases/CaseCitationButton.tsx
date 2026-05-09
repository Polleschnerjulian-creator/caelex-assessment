"use client";

/**
 * Atlas Lawyer-UX Audit F-CASES-2 (Quick-Win) + stage-2 (2026-05-09):
 *
 * Copy-Citation button on each case-list card. Marie sees the list
 * dozens of times per research session — she shouldn't have to open
 * the detail page just to cite a case.
 *
 * Stage-1 (shipped): two formats picked by UI language —
 *   - Plain (EN/FR): "Plaintiff v. Defendant, Citation, Forum (Year)"
 *   - Bluebuch DE:   "Plaintiff v. Defendant, Forum (Datum), Az.: Citation"
 *
 * Stage-2 (this update): explicit format-picker dropdown so lawyers
 * who prefer a non-locale-default style can pick once and have it
 * stick. Adds two bibliography formats Marie's bibliography software
 * actually consumes:
 *   - BibTeX  → @case{ ... } entry for bibliography managers
 *   - RIS     → TY/AU/PY/T1/M1/PB/ER block for Mendeley/EndNote
 *
 * The chosen format persists in localStorage (`atlas-citation-format`)
 * so a Mendeley-using partner ticks BibTeX once and the main button
 * always copies BibTeX after that. Defaults to the locale-appropriate
 * plain/bluebuch when no preference is set.
 */

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";

type CitationFormat = "plain" | "bluebuch" | "bibtex" | "ris";

const FORMAT_LABEL: Record<
  CitationFormat,
  { en: string; de: string; fr: string }
> = {
  plain: { en: "Plain", de: "Standard", fr: "Standard" },
  bluebuch: { en: "Bluebuch (DE)", de: "Bluebuch (DE)", fr: "Bluebuch (DE)" },
  bibtex: { en: "BibTeX", de: "BibTeX", fr: "BibTeX" },
  ris: { en: "RIS", de: "RIS", fr: "RIS" },
};

const FORMAT_HINT: Record<
  CitationFormat,
  { en: string; de: string; fr: string }
> = {
  plain: {
    en: "AGCITED-style memo citation",
    de: "AGCITED-Memo-Format",
    fr: "Format mémo AGCITED",
  },
  bluebuch: {
    en: "DE court / law-firm style",
    de: "DE-Bluebuch — Gerichts-/Kanzlei-Standard",
    fr: "Style cours / cabinets DE",
  },
  bibtex: {
    en: "@case{...} for LaTeX bibliographies",
    de: "@case{...} für LaTeX-Bibliographien",
    fr: "@case{...} pour bibliographies LaTeX",
  },
  ris: {
    en: "Mendeley / EndNote / Zotero",
    de: "Mendeley / EndNote / Zotero",
    fr: "Mendeley / EndNote / Zotero",
  },
};

const STORAGE_KEY = "atlas-citation-format";

interface Props {
  plaintiff: string;
  defendant: string;
  citation: string | null | undefined;
  forumName: string;
  dateDecided: string; // ISO date
  language: "de" | "en" | "fr";
}

/* Per-format builders. Kept as pure functions so a future test-suite
   can lock the exact output strings without standing up a React tree. */
function buildPlain(p: Props, year: string): string {
  return p.citation
    ? `${p.plaintiff} v. ${p.defendant}, ${p.citation}, ${p.forumName} (${year})`
    : `${p.plaintiff} v. ${p.defendant}, ${p.forumName} (${year})`;
}

function buildBluebuch(p: Props, formattedDate: string): string {
  return p.citation
    ? `${p.plaintiff} ./. ${p.defendant}, ${p.forumName} (${formattedDate}), Az.: ${p.citation}`
    : `${p.plaintiff} ./. ${p.defendant}, ${p.forumName} (${formattedDate})`;
}

function buildBibTeX(p: Props, year: string): string {
  /* Generate a stable cite-key from plaintiff surname + year. The
     space-stripped + lowercased + ascii-folded version isn't perfect,
     but it's predictable and survives most LaTeX engines. Fields kept
     to the BibTeX `@case` standard recognised by bibliography
     managers; `note` carries the citation when present. */
  const key = `${p.plaintiff.toLowerCase().replace(/[^a-z0-9]+/g, "")}-${year}`;
  const lines = [
    `@case{${key},`,
    `  title  = {${p.plaintiff} v. ${p.defendant}},`,
    `  year   = {${year}},`,
    `  court  = {${p.forumName}},`,
  ];
  if (p.citation) lines.push(`  note   = {${p.citation}},`);
  lines.push(`}`);
  return lines.join("\n");
}

function buildRIS(p: Props, year: string, dateDecided: string): string {
  /* RIS = tagged plain-text consumed by Zotero/Mendeley/EndNote.
     TY=CASE is the case-law type tag. PY+DA pair gives both year
     and full date. T1 = title, AU = parties as authors (so the
     reference shows up by plaintiff in the bibliography), PB =
     publisher/court, M1 = misc field where we park the citation. */
  const lines = [
    "TY  - CASE",
    `T1  - ${p.plaintiff} v. ${p.defendant}`,
    `AU  - ${p.plaintiff}`,
    `AU  - ${p.defendant}`,
    `PY  - ${year}`,
    `DA  - ${dateDecided}`,
    `PB  - ${p.forumName}`,
  ];
  if (p.citation) lines.push(`M1  - ${p.citation}`);
  lines.push("ER  - ");
  return lines.join("\n");
}

function defaultFormatForLanguage(language: Props["language"]): CitationFormat {
  return language === "de" ? "bluebuch" : "plain";
}

export function CaseCitationButton(props: Props) {
  const { plaintiff, defendant, citation, forumName, dateDecided, language } =
    props;
  const [copied, setCopied] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  /* Resolved format. Hydrates from localStorage on mount; falls back
     to the locale default. Two-step (default → effect-load) avoids
     SSR hydration mismatch. */
  const [format, setFormat] = useState<CitationFormat>(() =>
    defaultFormatForLanguage(language),
  );
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (
        stored === "plain" ||
        stored === "bluebuch" ||
        stored === "bibtex" ||
        stored === "ris"
      ) {
        setFormat(stored);
      }
    } catch {
      /* private browsing — leave language-default */
    }
  }, []);

  const wrapperRef = useRef<HTMLSpanElement>(null);

  /* Click-outside closes the picker. The case-card itself is a Link,
     so we only listen while open and stop propagation aggressively. */
  useEffect(() => {
    if (!pickerOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    window.addEventListener("mousedown", onDocMouseDown);
    return () => window.removeEventListener("mousedown", onDocMouseDown);
  }, [pickerOpen]);

  const year = dateDecided.slice(0, 4);
  const formattedDate = formatDate(dateDecided, language);

  function buildCitation(fmt: CitationFormat): string {
    switch (fmt) {
      case "bluebuch":
        return buildBluebuch(props, formattedDate);
      case "bibtex":
        return buildBibTeX(props, year);
      case "ris":
        return buildRIS(props, year, dateDecided);
      case "plain":
      default:
        return buildPlain(props, year);
    }
  }

  async function copyFormat(fmt: CitationFormat, persist: boolean) {
    const text = buildCitation(fmt);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      if (persist) {
        try {
          window.localStorage.setItem(STORAGE_KEY, fmt);
          setFormat(fmt);
        } catch {
          /* private browsing — selection is per-session */
        }
      }
    } catch {
      /* clipboard blocked (older browsers / restricted iframes).
         Detail page has a manual copy fallback. */
    }
  }

  async function handleMainCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await copyFormat(format, false);
  }

  function togglePicker(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPickerOpen((v) => !v);
  }

  const previewText = buildCitation(format);

  return (
    <span
      ref={wrapperRef}
      style={{ position: "relative", display: "inline-flex" }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={handleMainCopy}
        title={
          copied
            ? language === "de"
              ? "Zitat kopiert"
              : "Citation copied"
            : language === "de"
              ? `Zitat kopieren (${FORMAT_LABEL[format].de}): ${previewText}`
              : `Copy citation (${FORMAT_LABEL[format].en}): ${previewText}`
        }
        aria-label={
          language === "de"
            ? "Zitat in Zwischenablage kopieren"
            : "Copy citation"
        }
        className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors px-1.5 py-0.5 rounded-l hover:bg-[var(--atlas-bg-inset)]"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-emerald-600" strokeWidth={2} />
            <span className="text-emerald-700 dark:text-emerald-400">
              {language === "de" ? "Kopiert" : "Copied"}
            </span>
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" strokeWidth={1.5} />
            {language === "de" ? "Zitat" : "Cite"}
          </>
        )}
      </button>
      {/* F-CASES-2 stage-2: format-picker chevron. The main button
          stays one-click for the user's preferred format (sticky in
          localStorage); the chevron opens the picker for one-off
          alternative formats. */}
      <button
        type="button"
        onClick={togglePicker}
        aria-label={
          language === "de" ? "Zitat-Format wählen" : "Choose citation format"
        }
        aria-expanded={pickerOpen}
        title={
          language === "de"
            ? "Zitat-Format wählen (BibTeX, RIS, …)"
            : "Choose citation format (BibTeX, RIS, …)"
        }
        className="inline-flex items-center text-[10.5px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors px-1 py-0.5 rounded-r hover:bg-[var(--atlas-bg-inset)] border-l border-[var(--atlas-border-subtle)]"
      >
        <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
      </button>
      {pickerOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-20 min-w-[220px] rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-lg py-1"
          /* Stop propagation on the menu wrapper so clicks inside don't
             bubble to the case-card link. */
          onClick={(e) => e.stopPropagation()}
        >
          {(["plain", "bluebuch", "bibtex", "ris"] as CitationFormat[]).map(
            (fmt) => {
              const label =
                language === "de"
                  ? FORMAT_LABEL[fmt].de
                  : language === "fr"
                    ? FORMAT_LABEL[fmt].fr
                    : FORMAT_LABEL[fmt].en;
              const hint =
                language === "de"
                  ? FORMAT_HINT[fmt].de
                  : language === "fr"
                    ? FORMAT_HINT[fmt].fr
                    : FORMAT_HINT[fmt].en;
              const isCurrent = fmt === format;
              return (
                <button
                  key={fmt}
                  type="button"
                  role="menuitem"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await copyFormat(fmt, true);
                    setPickerOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-[var(--atlas-bg-inset)] flex items-start gap-2 ${
                    isCurrent
                      ? "text-[var(--atlas-text-primary)] font-medium"
                      : "text-[var(--atlas-text-secondary)]"
                  }`}
                >
                  <span className="w-3 mt-0.5 flex-shrink-0">
                    {isCurrent && (
                      <Check
                        className="h-3 w-3 text-emerald-600"
                        strokeWidth={2}
                      />
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block">{label}</span>
                    <span className="block text-[10px] text-[var(--atlas-text-faint)] truncate">
                      {hint}
                    </span>
                  </span>
                </button>
              );
            },
          )}
        </div>
      )}
    </span>
  );
}

function formatDate(iso: string, language: "de" | "en" | "fr"): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const locale =
      language === "de" ? "de-DE" : language === "fr" ? "fr-FR" : "en-GB";
    return d.toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
