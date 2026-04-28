"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import type { Language } from "@/lib/i18n";
import { getVerbatimAttribution } from "@/lib/atlas/verbatim-attribution";

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
 *   - When verbatim text IS present, renders a per-jurisdiction
 *     attribution footer: who published it, under which re-use
 *     licence, and a portal-link to the publisher. Resolved via
 *     `getVerbatimAttribution(jurisdiction)`. This is the audit
 *     close-out for Verbatim-attribution finding #6 — without it,
 *     a reader can't tell on what legal basis Caelex re-publishes
 *     the statute text (UrhG § 5 / 17 USC § 105 / OGL v3.0 / etc.).
 *
 * Caelex never invents this text. When `paragraph_text` is absent,
 * we render the disclosure but show only the deep-link, not a
 * fabricated excerpt.
 */
export function VerbatimProvisionText({
  paragraphText,
  paragraphUrl,
  fallbackUrl,
  jurisdiction,
  lastVerified,
  language,
}: {
  paragraphText?: string;
  paragraphUrl?: string;
  /** Falls back to the parent source's source_url when the provision
   *  itself doesn't carry a deep-link. */
  fallbackUrl?: string;
  /** ISO-alpha-2 country code, "EU" or "INT" — drives the
   *  per-jurisdiction publisher + licence-clause footer. Pass the
   *  parent `LegalSource.jurisdiction`. Optional: missing/unknown
   *  values fall back to a generic conservative clause. */
  jurisdiction?: string;
  /** ISO date the parent source was last verified by Caelex (i.e.
   *  `LegalSource.last_verified`). Surfaced in the attribution
   *  footer alongside the publisher to tell the reader exactly when
   *  the text was retrieved. */
  lastVerified?: string;
  language: Language;
}) {
  const [open, setOpen] = useState(false);
  const url = paragraphUrl || fallbackUrl;
  const isDe = language === "de";

  // Nothing to disclose at all (no verbatim text AND no link) —
  // render nothing rather than a dead toggle.
  if (!paragraphText && !url) return null;

  // Per-jurisdiction publisher + licence clause. Resolved here (not
  // inside the conditional render) so we have access to it for both
  // the verbatim-text path AND the no-verbatim path — the clause is
  // most useful exactly when text IS shown, but a publisher portal
  // link is also helpful when only the deep-link is available.
  const attribution = paragraphText
    ? getVerbatimAttribution(jurisdiction)
    : null;
  const formattedRetrievalDate = (() => {
    if (!lastVerified) return null;
    const d = new Date(lastVerified);
    if (Number.isNaN(d.getTime())) return lastVerified;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return isDe ? `${dd}.${mm}.${yyyy}` : `${yyyy}-${mm}-${dd}`;
  })();

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

          {/* Per-jurisdiction attribution footer — only when verbatim
              text is actually shown. Tells the reader who published
              the text Caelex copied, on what legal basis Caelex
              re-publishes it (UrhG § 5 / 17 USC § 105 / OGL / etc.),
              and when Caelex last verified it against the source. */}
          {attribution && (
            <div
              className="mt-3 pt-2 border-t border-[var(--atlas-border)] text-[10.5px] leading-[1.55] text-[var(--atlas-text-muted)]"
              role="note"
            >
              <p className="mb-1">
                <strong className="font-semibold text-[var(--atlas-text-secondary)]">
                  {isDe ? "Quelle: " : "Source: "}
                </strong>
                {attribution.publisher}
                {formattedRetrievalDate && (
                  <>
                    {" "}
                    <span className="text-[var(--atlas-text-faint)]">
                      ·{" "}
                      {isDe
                        ? `Caelex-Stand: ${formattedRetrievalDate}`
                        : `Caelex retrieval date: ${formattedRetrievalDate}`}
                    </span>
                  </>
                )}
              </p>
              <p className="italic">
                {isDe
                  ? attribution.licenseClause.de
                  : attribution.licenseClause.en}
              </p>
              {attribution.publisherUrl && (
                <a
                  href={attribution.publisherUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[10.5px] text-[var(--atlas-text-muted)] hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline"
                >
                  <ExternalLink className="h-2.5 w-2.5" strokeWidth={1.5} />
                  {isDe ? "Quellenportal öffnen" : "Open source portal"}
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
