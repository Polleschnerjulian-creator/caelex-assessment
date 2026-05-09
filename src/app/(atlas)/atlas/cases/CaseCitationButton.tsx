"use client";

/**
 * Atlas Lawyer-UX Audit F-CASES-2 (Quick-Win):
 * Copy-Citation button on each case-list card. Marie sees the list
 * dozens of times per research session — she shouldn't have to open
 * the detail page just to cite a case. Two formats supported:
 *   - Plain: "Plaintiff v. Defendant, Citation, Forum (Year)"
 *   - Bluebuch DE: "Plaintiff v. Defendant, Forum (Datum), Az.: Citation"
 *
 * Stage-2 (later) adds BlueBook + OSCOLA + RIS-bibliography-format
 * picker and a per-case-detail-page version.
 */

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface Props {
  plaintiff: string;
  defendant: string;
  citation: string | null | undefined;
  forumName: string;
  dateDecided: string; // ISO date
  language: "de" | "en" | "fr";
}

export function CaseCitationButton({
  plaintiff,
  defendant,
  citation,
  forumName,
  dateDecided,
  language,
}: Props) {
  const [copied, setCopied] = useState(false);

  const year = dateDecided.slice(0, 4);
  const formattedDate = formatDate(dateDecided, language);

  // Plain-Text format — works in any document, used as the default.
  // Format follows the "AGCITED" convention common in EU legal
  // memos: "{plaintiff} v. {defendant}, {citation-or-NA}, {forum} ({year})"
  const plainCite = citation
    ? `${plaintiff} v. ${defendant}, ${citation}, ${forumName} (${year})`
    : `${plaintiff} v. ${defendant}, ${forumName} (${year})`;

  // German Bluebuch-ish format — preferred by DE courts + most
  // German law-firm style guides. Az. = "Aktenzeichen" (case number).
  const dePlainCite = citation
    ? `${plaintiff} ./. ${defendant}, ${forumName} (${formattedDate}), Az.: ${citation}`
    : `${plaintiff} ./. ${defendant}, ${forumName} (${formattedDate})`;

  const cite = language === "de" ? dePlainCite : plainCite;

  async function handleCopy(e: React.MouseEvent) {
    // The case-card itself is a <Link>; without stopPropagation the
    // copy-click would also navigate to the detail page.
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(cite);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Older browsers / restricted iframes — fall through to no-op.
      // The user can manually select+copy the citation from the
      // detail page as backup.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={
        copied
          ? language === "de"
            ? "Zitat kopiert"
            : "Citation copied"
          : language === "de"
            ? `Zitat kopieren: ${cite}`
            : `Copy citation: ${cite}`
      }
      aria-label={
        language === "de" ? "Zitat in Zwischenablage kopieren" : "Copy citation"
      }
      className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--atlas-bg-inset)]"
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
