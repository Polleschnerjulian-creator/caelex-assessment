/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — Document Meta (YAML-Frontmatter Parser + Serializer).
 *
 * Sprint 14 (2026-05-19). Strukturierte Dokument-Metadaten (Aktenzeichen,
 * Mandant, Empfänger, Betreff, etc.) werden als YAML-frontmatter am
 * Anfang des markdown-bodies serialisiert:
 *
 *   ---
 *   aktenzeichen: KM/2024/123
 *   mandant: SpaceCo GmbH
 *   empfänger: |
 *     Bundesministerium für Wirtschaft
 *     Referat VB3
 *     Berlin
 *   betreff: Antrag auf Genehmigung gem. § 2 WeltraumG
 *   ---
 *
 *   [body...]
 *
 * Pattern aus Jekyll/Hugo/Pandoc — standard markdown-extension die
 * von marked + turndown nicht angetastet wird (treaten ganzes block
 * als HR + paragraph). Wir parsen/serialisieren manuell drumherum.
 *
 * Beim laden: meta wird extrahiert, body ohne frontmatter geht in
 * TipTap. Beim speichern: meta wird re-serialisiert + prepended.
 * Damit weiß der PDF-generator auch davon (PDF-export liest die
 * felder aus dem body).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface DocumentMeta {
  aktenzeichen?: string;
  mandant?: string;
  empfänger?: string; /* multi-line */
  betreff?: string;
  gericht?: string;
  bearbeiter?: string;
  datum?: string;
}

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n?/;

/**
 * Parse YAML-frontmatter from a markdown body. Returns the meta-object
 * + the body without frontmatter. Supports plain `key: value` and
 * multi-line `key: |` blocks (YAML literal block style).
 */
export function parseDocumentMeta(body: string): {
  meta: DocumentMeta;
  body: string;
} {
  const match = body.match(FRONTMATTER_RE);
  if (!match) return { meta: {}, body };
  const yaml = match[1];
  const meta: DocumentMeta = {};
  const lines = yaml.split("\n");
  let currentKey: keyof DocumentMeta | null = null;
  let multiLine: string[] = [];
  const flushMultiLine = () => {
    if (currentKey && multiLine.length > 0) {
      meta[currentKey] = multiLine.join("\n").trimEnd();
    }
    currentKey = null;
    multiLine = [];
  };
  for (const line of lines) {
    /* Multi-line continuation (indented under a `|` block). */
    if (currentKey && (line.startsWith("  ") || line.startsWith("\t"))) {
      multiLine.push(line.replace(/^(?:  |\t)/, ""));
      continue;
    }
    flushMultiLine();
    const kv = line.match(/^([a-zA-ZäöüÄÖÜß]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1] as keyof DocumentMeta;
    const val = kv[2].trim();
    if (val === "|" || val === ">") {
      /* multi-line literal block starts on next line */
      currentKey = key;
      multiLine = [];
    } else if (val) {
      meta[key] = val;
    }
  }
  flushMultiLine();
  const bodyWithout = body.slice(match[0].length);
  return { meta, body: bodyWithout };
}

/**
 * Serialize a DocumentMeta back to YAML-frontmatter. Skips empty
 * fields. Returns the prefix-string to prepend to the body (with
 * trailing newline). Returns "" if meta is empty.
 */
export function serializeDocumentMeta(meta: DocumentMeta): string {
  const entries = Object.entries(meta).filter(
    ([_, v]) => v !== undefined && v !== null && String(v).trim() !== "",
  );
  if (entries.length === 0) return "";
  const lines: string[] = ["---"];
  for (const [key, value] of entries) {
    const v = String(value);
    if (v.includes("\n")) {
      lines.push(`${key}: |`);
      for (const line of v.split("\n")) {
        lines.push(`  ${line}`);
      }
    } else {
      lines.push(`${key}: ${v}`);
    }
  }
  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

/** Display labels (DE) for UI rendering. */
export const META_LABELS: Record<keyof DocumentMeta, string> = {
  aktenzeichen: "Aktenzeichen",
  mandant: "Mandant",
  empfänger: "Empfänger",
  betreff: "Betreff",
  gericht: "Gericht",
  bearbeiter: "Bearbeiter",
  datum: "Datum",
};
