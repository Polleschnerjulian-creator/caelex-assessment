/**
 * Atlas Lawyer-UX-Audit F-AI-4 — workspace pinboard export.
 *
 * The /atlas AI Mode workspace pinboard collects cards (user notes,
 * AI-synthesised clauses, AI answers) into a partner's research
 * scratchpad. Until this helper, the "Export PDF" / "Export Markdown"
 * buttons in the pinboard header hit a non-existent server route
 * (/api/atlas/workspaces/[id]/export) and silently 404'd — the
 * client's `if (!res.ok) return` swallowed every failure.
 *
 * Same pattern as F-COMP-1 (comparator export): serialise the cards
 * to markdown client-side, then hand off to the existing
 * exportDraftAsWord pipeline for chrome (header, footer, page
 * numbers, disclaimer back-stop).
 *
 * Card-kind awareness:
 *   - "user" cards render as plain section headings + body
 *   - "ai-clause" cards get an "AI-synthesised" annotation referencing
 *     the source-card IDs
 *   - "ai-answer" cards lead with the original "Frage:" question
 *     followed by Atlas's answer
 *
 * Cards are emitted in their original on-board order (caller passes
 * them in board-order). The export is one self-contained markdown
 * document — partner can paste into a memo, edit in Notion, or pipe
 * back through .doc/.md to share with co-counsel.
 */

import type { WorkspaceCard } from "@/components/atlas/ai-mode/WorkspacePinboardInline";

export type WorkspaceExportLocale = "en" | "de";

const TR = (locale: WorkspaceExportLocale, en: string, de: string): string =>
  locale === "de" ? de : en;

function formatTimestamp(
  unixMs: number,
  locale: WorkspaceExportLocale,
): string {
  try {
    const d = new Date(unixMs);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function renderCard(
  card: WorkspaceCard,
  index: number,
  locale: WorkspaceExportLocale,
): string {
  const stamp = formatTimestamp(card.createdAt, locale);
  /* H2 heading per card so Word's auto-TOC + navigation pane pick
     them up. Cards without an explicit title fall back to "Card N"
     so we never emit an empty heading. */
  const title =
    card.title && card.title.trim().length > 0
      ? card.title.trim()
      : `${TR(locale, "Card", "Karte")} ${index + 1}`;

  const lines: string[] = [`## ${title}`];

  /* Per-kind annotation row. Sits under the heading in muted text
     so a partner reading the export sees provenance at a glance. */
  if (card.kind === "ai-clause") {
    const sources = card.sourceCardIds?.join(", ") ?? "";
    lines.push(
      TR(
        locale,
        `*AI-synthesised${sources ? ` from cards: ${sources}` : ""} · ${stamp}*`,
        `*KI-Synthese${sources ? ` aus Karten: ${sources}` : ""} · ${stamp}*`,
      ),
    );
  } else if (card.kind === "ai-answer") {
    lines.push(
      TR(locale, `*Atlas answer · ${stamp}*`, `*Atlas-Antwort · ${stamp}*`),
    );
    if (card.question && card.question.trim().length > 0) {
      lines.push("");
      lines.push(
        TR(
          locale,
          `> **Question:** ${card.question.trim()}`,
          `> **Frage:** ${card.question.trim()}`,
        ),
      );
    }
  } else if (stamp.length > 0) {
    /* User cards get a quiet timestamp — no kind label needed. */
    lines.push(`*${stamp}*`);
  }

  lines.push("");
  lines.push(card.content);
  return lines.join("\n");
}

export interface BuildWorkspaceMarkdownArgs {
  /** Card list in board order — caller is responsible for sorting if
   *  the UI re-orders cards. */
  cards: WorkspaceCard[];
  /** Workspace title from the WorkspaceSummary; used for the H1 and
   *  the file name. Falls back to a sensible default. */
  workspaceTitle?: string;
  locale: WorkspaceExportLocale;
}

/**
 * Public entry point. Returns markdown body + suggested title that
 * the caller threads into exportDraftAsWord / exportDraftAsMarkdown.
 */
export function buildWorkspaceMarkdown(args: BuildWorkspaceMarkdownArgs): {
  markdown: string;
  title: string;
} {
  const { cards, workspaceTitle, locale } = args;
  const title =
    workspaceTitle && workspaceTitle.trim().length > 0
      ? workspaceTitle.trim()
      : TR(locale, "Atlas workspace", "Atlas-Arbeitsbereich");

  const intro = TR(
    locale,
    `Workspace export from Caelex Atlas — ${cards.length} card${
      cards.length === 1 ? "" : "s"
    } in board order. AI-synthesised cards are annotated with their source cards; AI answers carry the original question inline.`,
    `Arbeitsbereich-Export aus Caelex Atlas — ${cards.length} Karte${
      cards.length === 1 ? "" : "n"
    } in Board-Reihenfolge. KI-synthetisierte Karten sind mit ihren Quellkarten gekennzeichnet; KI-Antworten enthalten die ursprüngliche Frage inline.`,
  );

  const sections =
    cards.length === 0
      ? TR(
          locale,
          "*This workspace is empty — add cards from AI Mode and re-export.*",
          "*Dieser Arbeitsbereich ist leer — füge Karten aus dem AI Mode hinzu und exportiere erneut.*",
        )
      : cards.map((c, i) => renderCard(c, i, locale)).join("\n\n");

  const footer = TR(
    locale,
    `\n\n---\n\n*Generated by Caelex Atlas. AI-synthesised content has not been independently verified — review against primary sources before relying on this material in client work.*`,
    `\n\n---\n\n*Erstellt mit Caelex Atlas. KI-synthetisierte Inhalte wurden nicht unabhängig verifiziert — vor Verwendung in der Mandantenarbeit am Originalmaterial prüfen.*`,
  );

  const markdown = `# ${title}\n\n${intro}\n\n${sections}${footer}`;
  return { markdown, title };
}
