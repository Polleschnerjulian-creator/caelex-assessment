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
