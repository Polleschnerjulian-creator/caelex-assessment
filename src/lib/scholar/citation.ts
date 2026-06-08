/**
 * Scholar citation export — pure formatters (BibTeX / RIS).
 *
 * No "use client" / no "server-only": importable from BOTH the client cite
 * component (source/case detail) and the server reading-list export, so the two
 * features share one source of truth.
 */

export interface CitationInput {
  id: string;
  title: string;
  kind: "source" | "case";
  jurisdiction?: string | null;
  /** Official reference / citation string (e.g. "BGBl. I 2007 S. 2278"). */
  reference?: string | null;
  year?: number | string | null;
  url?: string | null;
  /** Issuing body / court. */
  authority?: string | null;
}

// ─── helpers ───────────────────────────────────────────────────────────────────

function clean(v: unknown): string {
  return String(v ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Minimal BibTeX value escaping (the value sits inside {...}). */
function bib(v: unknown): string {
  return clean(v).replace(/([&%#_$])/g, "\\$1");
}

function yearOf(c: CitationInput): string {
  const y = clean(c.year);
  const m = y.match(/\d{4}/);
  return m ? m[0] : "";
}

function citeKey(c: CitationInput): string {
  const slug = c.id.replace(/[^A-Za-z0-9]/g, "");
  return `caelex${c.kind === "case" ? "Case" : "Src"}${slug}`;
}

// ─── BibTeX ─────────────────────────────────────────────────────────────────────

export function toBibTeX(c: CitationInput): string {
  const fields: [string, string][] = [];
  fields.push(["title", bib(c.title)]);
  const y = yearOf(c);
  if (y) fields.push(["year", y]);
  if (c.reference) fields.push(["howpublished", bib(c.reference)]);
  if (c.authority) fields.push(["publisher", bib(c.authority)]);
  if (c.url) fields.push(["url", clean(c.url)]);
  const noteBits = [
    c.jurisdiction ? clean(c.jurisdiction) : "",
    "Caelex Scholar",
  ]
    .filter(Boolean)
    .join(" · ");
  fields.push(["note", bib(noteBits)]);

  const body = fields.map(([k, v]) => `  ${k.padEnd(12)} = {${v}}`).join(",\n");
  return `@misc{${citeKey(c)},\n${body}\n}`;
}

// ─── RIS (Zotero / EndNote / Mendeley) ──────────────────────────────────────────

export function toRIS(c: CitationInput): string {
  const lines: string[] = [];
  lines.push(`TY  - ${c.kind === "case" ? "CASE" : "STAT"}`);
  lines.push(`TI  - ${clean(c.title)}`);
  const y = yearOf(c);
  if (y) lines.push(`PY  - ${y}`);
  if (c.authority) lines.push(`PB  - ${clean(c.authority)}`);
  if (c.reference) lines.push(`M1  - ${clean(c.reference)}`);
  if (c.jurisdiction) lines.push(`CY  - ${clean(c.jurisdiction)}`);
  if (c.url) lines.push(`UR  - ${clean(c.url)}`);
  lines.push("N1  - via Caelex Scholar");
  lines.push("ER  - ");
  return lines.join("\n");
}

/** Concatenate many BibTeX entries (used by reading-list export). */
export function toBibTeXList(items: CitationInput[]): string {
  return items.map(toBibTeX).join("\n\n") + "\n";
}
