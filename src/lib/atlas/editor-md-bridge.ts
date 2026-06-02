/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — Markdown ↔ HTML Bridge für den TipTap-Editor.
 *
 * Sprint 9d (2026-05-18). Ersetzt die homebrew markdown-html.ts (zu
 * fragil bei real-world content mit kaputten markdown-markern). Jetzt
 * mit `marked` (MD→HTML, CommonMark + GFM compliant) + `turndown`
 * (HTML→MD, mit GFM-plugin für tables).
 *
 * Beide Libraries sind battle-tested:
 * - marked: 33k stars, used by Discord, Mastodon
 * - turndown: 9k stars, used by Notion-import, browser bookmark tools
 *
 * Configuriert für unsere markdown-konventionen:
 * - ATX-headings (# ## ###) statt setext (===)
 * - Bullets mit "-" (nicht "*")
 * - Italic mit "*" (nicht "_")
 * - GFM tables enabled
 * - Strikethrough als ~~text~~
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { marked } from "marked";
import TurndownService from "turndown";
import { gfm } from "@joplin/turndown-plugin-gfm";

/* ── Markdown → HTML (für TipTap initial-content) ──────────────────── */

marked.setOptions({
  gfm: true,
  breaks: false,
});

export function markdownToHtml(md: string): string {
  if (!md) return "";
  try {
    return marked.parse(md, { async: false }) as string;
  } catch (err) {
    console.error("markdownToHtml failed:", err);
    return `<p>${escapeHtml(md)}</p>`;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ── HTML → Markdown (beim save zurück nach markdown) ─────────────── */

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
  strongDelimiter: "**",
  hr: "---",
  linkStyle: "inlined",
});

/* GFM-Plugin aktiviert: tables, strikethrough, task-lists. */
turndown.use(gfm);

/* Custom rule: highlight (mark) → keep as plain text (markdown hat
   keine highlight-syntax, wir lassen den inhalt durchfließen). */
turndown.addRule("highlight", {
  filter: ["mark"],
  replacement: (content) => `==${content}==`,
});

/* Custom rule: underline (u) → fold to bold (markdown hat kein
   underline native). */
turndown.addRule("underline", {
  filter: ["u"],
  replacement: (content) => `**${content}**`,
});

/* Sprint 13 — Citation-mark roundtrip preservation. Inserted via
   CitationDialog as <span class="atlas-citation" data-citation-type="X">
   Text</span>. Markdown has no native citation-syntax → we keep the
   span as raw HTML in the markdown body. marked (das wir auf der
   anderen seite nutzen) parsed inline-HTML by default mit gfm-mode,
   sodass es bei reopen wieder als citation-mark erkannt wird. */
turndown.addRule("atlasCitation", {
  filter: (node) =>
    node.nodeName === "SPAN" &&
    (node as HTMLElement).classList.contains("atlas-citation"),
  replacement: (content, node) => {
    const type =
      (node as HTMLElement).getAttribute("data-citation-type") ?? "gesetz";
    return `<span class="atlas-citation" data-citation-type="${type}">${content}</span>`;
  },
});

/* Sprint 16 — Suggestion-marks roundtrip (ins/del). Preserved als
   raw HTML im markdown body damit beim reopen die suggestions wieder
   erkannt werden + die suggestionsJson-meta-payload sich auf die marks
   refresht. */
turndown.addRule("atlasInsertion", {
  filter: (node) =>
    node.nodeName === "INS" &&
    (node as HTMLElement).classList.contains("atlas-insertion"),
  replacement: (content, node) => {
    const id = (node as HTMLElement).getAttribute("data-suggestion-id") ?? "";
    return `<ins class="atlas-insertion" data-suggestion-id="${id}">${content}</ins>`;
  },
});
turndown.addRule("atlasDeletion", {
  filter: (node) =>
    node.nodeName === "DEL" &&
    (node as HTMLElement).classList.contains("atlas-deletion"),
  replacement: (content, node) => {
    const id = (node as HTMLElement).getAttribute("data-suggestion-id") ?? "";
    return `<del class="atlas-deletion" data-suggestion-id="${id}">${content}</del>`;
  },
});

/* Sprint 15 — Comment-mark roundtrip. Behält das <span class="atlas-
   comment" data-comment-id="X" data-resolved="Y">…</span> als raw-HTML
   damit beim reopen die comment-marks + ihre IDs wieder erkennt + an
   die comments-state-array gemapped werden können. */
turndown.addRule("atlasComment", {
  filter: (node) =>
    node.nodeName === "SPAN" &&
    (node as HTMLElement).classList.contains("atlas-comment"),
  replacement: (content, node) => {
    const el = node as HTMLElement;
    const id = el.getAttribute("data-comment-id") ?? "";
    const resolved = el.getAttribute("data-resolved") === "true";
    return `<span class="atlas-comment" data-comment-id="${id}"${resolved ? ' data-resolved="true"' : ""}>${content}</span>`;
  },
});

/* Sprint 12 — Cross-reference link roundtrip. Same pattern: keep the
   <a class="atlas-cross-ref" ...> as raw HTML so click-handler can
   re-attach on reload. */
turndown.addRule("atlasCrossRef", {
  filter: (node) =>
    node.nodeName === "A" &&
    (node as HTMLElement).classList.contains("atlas-cross-ref"),
  replacement: (content, node) => {
    const el = node as HTMLElement;
    const pos = el.getAttribute("data-target-pos") ?? "";
    const kind = el.getAttribute("data-cross-ref") ?? "heading";
    return `<a class="atlas-cross-ref" data-cross-ref="${kind}" data-target-pos="${pos}">${content}</a>`;
  },
});

/* Sprint 11 — LegalOrderedList round-trip preservation. TipTap renders
   <ol type="I">, <ol type="A">, etc. for roman/alpha legal lists.
   Standard turndown collapses them to "1. 2. 3." losing the list-type
   attribute — data loss for German legal filings on every save cycle.

   Fix: intercept <ol> nodes that carry a non-default `type` attribute
   and emit them as raw inline HTML. marked (used on the other side in
   markdownToHtml) parses inline HTML in GFM mode by default, so the
   <ol type="…"> survives the full MD→HTML→save→MD→reopen round-trip.

   Type "1" (decimal) is the HTML default — we let those fall through
   to turndown's normal ordered-list handling so we don't break regular
   1./2./3. lists. */
turndown.addRule("legalOrderedList", {
  filter: (node) => {
    if (node.nodeName !== "OL") return false;
    const t = (node as HTMLElement).getAttribute("type");
    return !!t && t !== "1";
  },
  replacement: (_content, node) => {
    /* Re-serialise the entire <ol type="…">…</ol> subtree as raw HTML.
       turndown normally strips the outer <ol> and converts <li> children
       recursively; here we bypass that and keep the full HTML so that
       marked can restore the TipTap node with the correct listType
       attribute on reload. */
    return "\n\n" + (node as HTMLElement).outerHTML + "\n\n";
  },
});

/* Custom rule: task-list-item — turndown's gfm-plugin handles task-
   lists but the syntax can be inconsistent. Lock it down here. */
turndown.addRule("taskListItem", {
  filter: (node) =>
    node.nodeName === "LI" &&
    !!(node as HTMLElement).getAttribute("data-type") &&
    (node as HTMLElement).getAttribute("data-type") === "taskItem",
  replacement: (content, node) => {
    const checked =
      (node as HTMLElement).getAttribute("data-checked") === "true";
    return `- [${checked ? "x" : " "}] ${content.trim()}\n`;
  },
});

export function htmlToMarkdown(html: string): string {
  if (!html) return "";
  try {
    return turndown
      .turndown(html)
      .replace(/\n{3,}/g, "\n\n") /* collapse triple-newlines */
      .trim();
  } catch (err) {
    console.error("htmlToMarkdown failed:", err);
    /* Fallback: strip tags */
    return html.replace(/<[^>]+>/g, "").trim();
  }
}
