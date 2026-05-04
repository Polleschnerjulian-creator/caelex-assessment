/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Single canonical source for the legal-review disclaimer that wraps
 * every Atlas drafting output (Astra's drafted memos, comparison
 * matrices, deadline lists) and every Word/Markdown export.
 *
 * Why server-side enforcement: the disclaimer is a HARD RULE in the
 * Astra system prompt, but at temperature > 0 the model can drift.
 * The audit found this was the largest legal-posture gap — a polished
 * Genehmigungsantrag that ships without the "ersetzt keine rechtliche
 * Beratung" wrap reads, on its own, as legal advice.
 *
 * Detection contract: any text containing the substring
 * "Wichtiger Hinweis" (DE) OR "Important Notice" (EN) is treated as
 * carrying the disclaimer. Both bilingual versions are written so a
 * mixed-language conversation always has at least one matching marker.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export type DisclaimerLocale = "de" | "en";

/**
 * Stable detection markers — if either string is present in the
 * assistant text, the disclaimer is considered present and won't be
 * re-injected. These match the opening tokens of the canonical
 * disclaimer text below.
 */
export const DISCLAIMER_MARKERS = [
  "Wichtiger Hinweis",
  "Important Notice",
  // Older free-text Astra outputs sometimes used these phrasings —
  // tolerate them so the back-stop doesn't double-wrap legacy drafts
  // saved in the user's library.
  "Dieser Entwurf ist ein KI-generiertes Erstgerüst",
  "This draft is an AI-generated first-pass scaffold",
] as const;

const DISCLAIMER_DE = `> **Wichtiger Hinweis** — KI-generiertes Erstgerüst (Caelex Atlas)
>
> Dieser Entwurf ist ein KI-generiertes Erstgerüst auf Basis des
> Atlas-Katalogs. Er ersetzt KEINE rechtliche Beratung durch einen
> zugelassenen Anwalt. Vor Einreichung an eine Behörde, Vertragspartei
> oder Gegenseite ist eine vollständige juristische Prüfung durch
> eine zugelassene/n Anwältin/Anwalt zwingend erforderlich. Atlas
> haftet nicht für inhaltliche Vollständigkeit oder Aktualität.`;

const DISCLAIMER_EN = `> **Important Notice** — AI-generated first-pass scaffold (Caelex Atlas)
>
> This draft is an AI-generated first-pass scaffold based on the
> Atlas catalogue. It does NOT replace legal advice from a qualified
> attorney. Full legal review by qualified counsel is mandatory
> before any submission to an authority, contractual counterparty,
> or opposing party. Atlas does not warrant completeness or currency.`;

/**
 * Canonical disclaimer text in the requested locale. Always returned
 * as a Markdown blockquote (`> `-prefixed lines) so it survives
 * .doc/.md export styling intact.
 */
export function disclaimerFor(locale: DisclaimerLocale): string {
  return locale === "de" ? DISCLAIMER_DE : DISCLAIMER_EN;
}

/**
 * Returns true if a disclaimer is already present in `text`. Match
 * is substring-based on the stable markers — robust against
 * paraphrase and case variation inside the marker phrase itself.
 */
export function hasDisclaimer(text: string): boolean {
  return DISCLAIMER_MARKERS.some((m) => text.includes(m));
}

/**
 * Names of the Astra tools whose outputs MUST be wrapped in the
 * disclaimer. The wrap fires when ANY of these were invoked in the
 * conversation turn — i.e. once the user has crossed from "research"
 * into "drafting" the artifact must carry the legal-review notice.
 *
 * Kept in sync with src/lib/atlas/atlas-tools.ts. Adding a new
 * drafting tool? Append its name here too — the back-stop won't
 * fire otherwise.
 */
export const DISCLAIMER_TRIGGER_TOOLS: ReadonlySet<string> = new Set([
  "draft_authorization_application",
  "draft_compliance_brief",
  "compare_jurisdictions_for_filing",
  "get_filing_deadlines",
  // M-3 fix: regulatory-change reports produced by summarize_changes_since
  // are drafting outputs that lawyers may forward verbatim — they need the
  // same EU-AI-Act disclaimer back-stop as the explicit drafting tools.
  "summarize_changes_since",
]);

/**
 * Produce the prefix block to prepend before an exported document.
 * Stronger than the conversational wrap — used by the .doc / .md
 * export pipeline to GUARANTEE the disclaimer leads the file even
 * if the source markdown lost it (e.g. the user pasted Astra output
 * into Notion, edited, and re-exported).
 */
export function exportPrefix(locale: DisclaimerLocale): string {
  return disclaimerFor(locale) + "\n\n";
}
