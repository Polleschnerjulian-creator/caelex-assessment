"use client";

import { useState } from "react";
import { Quote, Check } from "lucide-react";

/**
 * "Quote this provision" — single-click capture of a provision into
 * the lawyer's source-page notes block (SourceNotes).
 *
 * Bridges to SourceNotes via a global CustomEvent rather than a
 * shared store: the source-detail page already mounts SourceNotes
 * with its own load/save lifecycle and we don't want to touch its
 * data flow. The button dispatches `atlas-quote-provision` with the
 * formatted block; SourceNotes listens on the same source-id and
 * appends to its in-memory textarea, then debounce-saves as usual.
 *
 * Format inserted into the notes blob:
 *
 *     > § 25.114 — Authorization application contents
 *     > "Detailed orbital and spectrum information must accompany
 *     >  every initial application."
 *     >
 *     > [Atlas — quoted on 28 Apr 2026]
 *
 * The blockquote markers ('>') survive a paste into Word and
 * Notion as quote-styled paragraphs.
 */

export const QUOTE_PROVISION_EVENT = "atlas-quote-provision";

export interface QuoteProvisionDetail {
  sourceId: string;
  block: string;
}

export function dispatchQuote(detail: QuoteProvisionDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<QuoteProvisionDetail>(QUOTE_PROVISION_EVENT, { detail }),
  );
}

interface Props {
  sourceId: string;
  section: string;
  title: string;
  summary: string;
  complianceImplication?: string;
  language: "en" | "de" | "fr" | "es";
}

function formatQuote(
  opts: Omit<Props, "language">,
  locale: "en" | "de",
): string {
  const date = new Date().toLocaleDateString(
    locale === "de" ? "de-DE" : "en-GB",
    { day: "numeric", month: "short", year: "numeric" },
  );
  const lines: string[] = [];
  // Heading line — section + title in one block.
  lines.push(`> ${opts.section} — ${opts.title}`);
  // Wrap summary in quote marks so the blockquote keeps the "verbatim"
  // visual cue. Word-wrap manually at 72 chars so the quote stays
  // readable when pasted into a fixed-width context.
  const wrapped = wrapText(opts.summary, 72);
  for (const w of wrapped) {
    lines.push(`> "${w}"`);
  }
  if (opts.complianceImplication) {
    lines.push(`>`);
    lines.push(
      `> ${locale === "de" ? "Compliance-Implikation" : "Compliance implication"}:`,
    );
    for (const w of wrapText(opts.complianceImplication, 72)) {
      lines.push(`> ${w}`);
    }
  }
  lines.push(`>`);
  lines.push(
    `> [${locale === "de" ? "Atlas — zitiert am" : "Atlas — quoted on"} ${date} · ${opts.sourceId} ${opts.section}]`,
  );
  return lines.join("\n");
}

function wrapText(s: string, width: number): string[] {
  const words = s.replace(/\s+/g, " ").trim().split(" ");
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    if (line.length === 0) {
      line = w;
    } else if (line.length + 1 + w.length <= width) {
      line += " " + w;
    } else {
      out.push(line);
      line = w;
    }
  }
  if (line) out.push(line);
  return out;
}

export function QuoteProvisionButton(props: Props) {
  const [done, setDone] = useState(false);
  const isDe = props.language === "de";
  const handleClick = () => {
    const block = formatQuote(props, isDe ? "de" : "en");
    dispatchQuote({ sourceId: props.sourceId, block });
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isDe ? "Provision in Notizen zitieren" : "Quote into notes"}
      aria-label={isDe ? "Provision in Notizen zitieren" : "Quote into notes"}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[var(--atlas-text-faint)] hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
    >
      {done ? (
        <>
          <Check
            className="h-3 w-3 text-emerald-600"
            strokeWidth={2}
            aria-hidden="true"
          />
          <span>{isDe ? "Zitiert" : "Quoted"}</span>
        </>
      ) : (
        <>
          <Quote className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
          <span>{isDe ? "Zitieren" : "Quote"}</span>
        </>
      )}
    </button>
  );
}
