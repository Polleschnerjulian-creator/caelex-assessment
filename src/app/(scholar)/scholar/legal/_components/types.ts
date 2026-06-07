/**
 * Caelex Scholar — legal-document content types.
 *
 * Shape of a structured legal document rendered by <LegalDoc />. Each public
 * legal page supplies TWO documents — a binding German one and a convenience
 * English one — and LegalDoc picks DE when the active UI locale is "de", else
 * EN (see LegalDoc.tsx).
 *
 * Pure types — no JSX, no "server-only" — so both content files (server) and
 * the LegalDoc renderer (server) can import them.
 *
 * Block model mirrors the platform legal types (src/lib/legal/types.ts) so the
 * authoring style is familiar, but the Scholar wrapper is intentionally lighter:
 * it carries only what a Scholar legal page needs (title, version, last-updated,
 * sections) — no platform-only fields (legalEntity, annexes, contactLines,
 * top-level links). Anything extra goes in a normal section block.
 */

/** A single renderable block within a section. */
export type ScholarLegalBlock =
  /** A paragraph of prose. */
  | { type: "p"; text: string }
  /** A bulleted list. */
  | { type: "ul"; items: string[] }
  /** A numbered list. */
  | { type: "num"; items: string[] }
  /** A boxed aside. `warn` = monochrome emphasis box; `info` = subtle box. */
  | { type: "callout"; variant: "warn" | "info"; text: string }
  /** A term + definition pair (e.g. a defined term in Terms). */
  | { type: "definition"; term: string; text: string }
  /** A sub-heading INSIDE a section (renders as <h3>). */
  | { type: "subheading"; text: string };

/** A top-level numbered section of the document (renders an <h2>). */
export interface ScholarLegalSection {
  /** Stable anchor id (e.g. "s1"); used for the heading's `id`. */
  id: string;
  /** Display number/eyebrow, e.g. "§ 1" or "Section 1". Optional. */
  number?: string;
  /** Section heading text. */
  title: string;
  /** Ordered renderable blocks. */
  blocks: ScholarLegalBlock[];
}

/**
 * One language edition of a Scholar legal document.
 *
 * Content files export one `*_DE` and one `*_EN` of this shape. See the
 * `_content/<slug>-de.ts` / `<slug>-en.ts` convention documented in
 * LegalDoc.tsx and the doc-agent CONTRACT.
 */
export interface ScholarLegalDoc {
  /** Edition language — drives <article lang> and DE-binding emphasis. */
  lang: "de" | "en";
  /** Document title (e.g. "Datenschutzerklärung" / "Privacy Policy"). */
  title: string;
  /** Optional one-line subtitle under the title. */
  subtitle?: string;
  /** Version line, e.g. "Version 0.1 (Entwurf)" / "Version 0.1 (Draft)". */
  version: string;
  /**
   * Last-updated / "Stand" value shown in the meta line. Authors may use the
   * `{{DATE}}` placeholder until a real date is set; LegalDoc renders it as-is.
   */
  lastUpdated: string;
  /** Optional lead paragraphs shown above the first section. */
  preamble?: string[];
  /** Ordered document sections. */
  sections: ScholarLegalSection[];
}
