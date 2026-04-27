"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import type { Language } from "@/lib/i18n";

/**
 * Verbatim-statutory-text disclosure for a KeyProvision card on the
 * source-detail page. Lawyer's biggest "is Atlas real?" moment is:
 * Astra cited [DE-BWRG-3] — can I read the actual statutory paragraph
 * here, not a Caelex paraphrase? Yes you can.
 *
 * Behaviour:
 *   - Collapsed by default. The card stays compact for browsing.
 *   - Expand toggle reveals the verbatim text in a serif typeface
 *     (signals "law's own words"), wrapped in a blockquote-style
 *     pane.
 *   - Always shows the "Open official text" deep-link, even when
 *     verbatim text is missing — the link is the second-best
 *     verifiability path.
 *
 * Caelex never invents this text. When `paragraph_text` is absent,
 * we render the disclosure but show only the deep-link, not a
 * fabricated excerpt.
 */
export function VerbatimProvisionText({
  paragraphText,
  paragraphUrl,
  fallbackUrl,
  language,
}: {
  paragraphText?: string;
  paragraphUrl?: string;
  /** Falls back to the parent source's source_url when the provision
   *  itself doesn't carry a deep-link. */
  fallbackUrl?: string;
  language: Language;
}) {
  const [open, setOpen] = useState(false);
  const url = paragraphUrl || fallbackUrl;
  const isDe = language === "de";

  // Nothing to disclose at all (no verbatim text AND no link) —
  // render nothing rather than a dead toggle.
  if (!paragraphText && !url) return null;

  return (
    <div className="mt-3 ml-[52px] max-w-3xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" strokeWidth={1.8} />
        ) : (
          <ChevronRight className="h-3 w-3" strokeWidth={1.8} />
        )}
        <BookOpen className="h-3 w-3" strokeWidth={1.5} />
        <span>
          {paragraphText
            ? isDe
              ? "Original-Wortlaut"
              : "Original text"
            : isDe
              ? "Offizieller Text"
              : "Official text"}
        </span>
      </button>

      {open && (
        <div className="mt-2 rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface-muted)] px-4 py-3">
          {paragraphText ? (
            <blockquote
              className="text-[13px] text-[var(--atlas-text-primary)] leading-[1.7] whitespace-pre-line"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {paragraphText}
            </blockquote>
          ) : (
            <p className="text-[12px] italic text-[var(--atlas-text-muted)]">
              {isDe
                ? "Wörtlicher Wortlaut wird derzeit nachgepflegt — bitte beim offiziellen Text verifizieren."
                : "Verbatim text is being backfilled — please verify against the official text."}
            </p>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
              {isDe ? "Offizieller Text öffnen" : "Open official text"}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
