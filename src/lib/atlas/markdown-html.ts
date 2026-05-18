/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — Markdown ↔ HTML Roundtrip für den WYSIWYG-Editor.
 *
 * Sprint 9c (2026-05-18). Der ArtifactEditor wurde Word-like umgebaut:
 * statt monospace-textarea ein contenteditable-div mit gerendertem HTML.
 * Die AI + der PDF-Generator brauchen aber weiterhin Markdown als
 * source-of-truth. Daher: HTML beim editieren als visual layer, beim
 * speichern wieder zurück nach Markdown.
 *
 * Bewusst KEIN remark/rehype hier — die kosten 100KB+ und unsere
 * markdown-features (H1/H2/H3, bold/italic/code, ul/ol/blockquote,
 * links, basic tables) sind eine winzige teilmenge die wir in ~200
 * zeilen handhaben können.
 *
 * EDGE-CASES wir bewusst nicht handlen (V1):
 * - Tiefe nested-lists (>1 level deep)
 * - Tabellen mit komplexen cells (multi-line)
 * - Code-blocks (mehrzeilig)
 * - Mixed inline-formatting (bold-italic-link in einem token)
 * - HTML in markdown
 * Für diese fälle: User kann zum "Quelltext"-mode toggeln.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/* ── Markdown → HTML ──────────────────────────────────────────────── */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Inline-format: bold, italic, code, link. Order matters — bold MUST
 *  be processed before italic because **x** matches *x* twice. */
function inlineMdToHtml(s: string): string {
  let out = escapeHtml(s);
  /* Links [text](url) — process first so url-chars don't get formatted */
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    const safeUrl = url.replace(/"/g, "&quot;");
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });
  /* Bold **text** */
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  /* Italic *text* — single-asterisk, not preceded/followed by another * */
  out = out.replace(/(^|[^*])\*([^*]+)\*([^*]|$)/g, "$1<em>$2</em>$3");
  /* Inline code `text` */
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  return out;
}

export function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let i = 0;
  let inUl = false;
  let inOl = false;

  const closeListsIfAny = () => {
    if (inUl) {
      html.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      html.push("</ol>");
      inOl = false;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    /* Blank line → close lists + paragraph-break */
    if (line.trim() === "") {
      closeListsIfAny();
      html.push("<p><br></p>");
      i++;
      continue;
    }

    /* Headings */
    if (/^# /.test(line)) {
      closeListsIfAny();
      html.push(`<h1>${inlineMdToHtml(line.slice(2))}</h1>`);
      i++;
      continue;
    }
    if (/^## /.test(line)) {
      closeListsIfAny();
      html.push(`<h2>${inlineMdToHtml(line.slice(3))}</h2>`);
      i++;
      continue;
    }
    if (/^### /.test(line)) {
      closeListsIfAny();
      html.push(`<h3>${inlineMdToHtml(line.slice(4))}</h3>`);
      i++;
      continue;
    }

    /* Roman numeral section heading — render as H2 visual */
    if (/^[IVX]+\.\s/.test(line)) {
      closeListsIfAny();
      html.push(`<h2 data-roman="true">${inlineMdToHtml(line)}</h2>`);
      i++;
      continue;
    }

    /* Blockquote */
    if (/^>\s?/.test(line)) {
      closeListsIfAny();
      html.push(
        `<blockquote>${inlineMdToHtml(line.replace(/^>\s?/, ""))}</blockquote>`,
      );
      i++;
      continue;
    }

    /* Unordered list */
    if (/^[-*+]\s+/.test(line)) {
      if (inOl) {
        html.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        html.push("<ul>");
        inUl = true;
      }
      html.push(`<li>${inlineMdToHtml(line.replace(/^[-*+]\s+/, ""))}</li>`);
      i++;
      continue;
    }

    /* Ordered list */
    if (/^\d+\.\s+/.test(line)) {
      if (inUl) {
        html.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        html.push("<ol>");
        inOl = true;
      }
      html.push(`<li>${inlineMdToHtml(line.replace(/^\d+\.\s+/, ""))}</li>`);
      i++;
      continue;
    }

    /* Plain paragraph — collect consecutive non-block lines into one <p>. */
    closeListsIfAny();
    const para: string[] = [line];
    let j = i + 1;
    while (j < lines.length) {
      const nxt = lines[j];
      if (
        nxt.trim() === "" ||
        /^(#{1,3}\s|>\s?|[-*+]\s+|\d+\.\s+|[IVX]+\.\s)/.test(nxt)
      ) {
        break;
      }
      para.push(nxt);
      j++;
    }
    html.push(`<p>${inlineMdToHtml(para.join(" "))}</p>`);
    i = j;
  }
  closeListsIfAny();
  return html.join("");
}

/* ── HTML → Markdown ──────────────────────────────────────────────── */

function unescapeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'");
}

function serializeNode(node: Node, listContext?: "ul" | "ol"): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return unescapeHtml(node.textContent ?? "");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const children = Array.from(el.childNodes)
    .map((c) =>
      serializeNode(c, tag === "ul" ? "ul" : tag === "ol" ? "ol" : listContext),
    )
    .join("");
  switch (tag) {
    case "h1":
      return `# ${children.trim()}\n\n`;
    case "h2":
      /* Preserve Roman-numeral sections that we marked at md→html time. */
      if (el.getAttribute("data-roman") === "true") {
        return `${children.trim()}\n\n`;
      }
      return `## ${children.trim()}\n\n`;
    case "h3":
      return `### ${children.trim()}\n\n`;
    case "h4":
    case "h5":
    case "h6":
      /* Fold to H3 (we don't formally support deeper). */
      return `### ${children.trim()}\n\n`;
    case "p":
    case "div":
      /* Empty <p><br></p> = blank line. */
      if (
        el.childNodes.length === 0 ||
        (el.childNodes.length === 1 &&
          (el.firstChild as HTMLElement)?.tagName?.toLowerCase() === "br")
      ) {
        return "\n";
      }
      return `${children.trim()}\n\n`;
    case "blockquote":
      return `> ${children.trim()}\n\n`;
    case "ul":
      return `${children}\n`;
    case "ol":
      return `${children}\n`;
    case "li": {
      const prefix = listContext === "ol" ? "1. " : "- ";
      return `${prefix}${children.trim()}\n`;
    }
    case "strong":
    case "b":
      return `**${children}**`;
    case "em":
    case "i":
      return `*${children}*`;
    case "code":
      return `\`${children}\``;
    case "a": {
      const href = el.getAttribute("href") ?? "";
      return `[${children}](${href})`;
    }
    case "br":
      return "\n";
    case "u":
      /* Markdown has no underline. We preserve as bold to keep emphasis. */
      return `**${children}**`;
    case "s":
    case "strike":
      return `~~${children}~~`;
    default:
      return children;
  }
}

export function htmlToMarkdown(html: string): string {
  if (typeof document === "undefined") {
    /* SSR fallback — strip all tags + return plain text. The editor is
       client-only so we shouldn't hit this in production. */
    return html.replace(/<[^>]+>/g, "");
  }
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const md = Array.from(tmp.childNodes)
    .map((n) => serializeNode(n))
    .join("");
  /* Collapse runs of >2 newlines to exactly 2. */
  return md.replace(/\n{3,}/g, "\n\n").trim();
}
