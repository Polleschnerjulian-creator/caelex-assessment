/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 *   GET /api/atlas/workspaces/[id]/export?format=md
 *
 * Outbound: turns a workspace into a versendbares Deliverable. The
 * pinboard is great for thinking-while-drafting; this endpoint turns
 * the result into a memo a lawyer can paste into Word, send to a
 * partner, or attach to a license application.
 *
 * Markdown is the universal intermediate — Word imports it, Pandoc
 * converts to PDF, GitHub renders it, mail clients keep the
 * structure. .docx + PDF can come later but markdown gets the lawyer
 * to "deliverable" today without the heavy renderer dep tree.
 *
 * Layout strategy (German legal memo style):
 *   1. Header        — workspace title, date, Atlas attribution
 *   2. Klauseln      — every ai-clause card (the headline output)
 *   3. Fragen + Antworten   — every ai-answer card with its question
 *   4. Notizen + Mandant    — user-cards
 *   5. Quellen-Anhang  — the corpus/source cards as cited footnotes
 *
 * The grouping reflects the lawyer's reading order — partner wants
 * the clause first, then the reasoning, then the sources — not the
 * chronological pin-order from the board.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Format a date as "26. April 2026" — the German legal memo format.
 * No locale-string deps; small lookup table beats pulling in
 * date-fns locale data for one date per export.
 */
const MONTHS_DE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];
function formatDateDe(d: Date): string {
  return `${d.getDate()}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Sluggify the workspace title for the download filename. Keeps
 * letters/digits/dashes; collapses anything else to a single dash.
 * Falls back to "workspace" if the result is empty (e.g. all-emoji
 * titles).
 */
function slug(s: string): string {
  const out = s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining marks
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return out.length > 0 ? out.slice(0, 60) : "workspace";
}

/**
 * Detect a card kind that should sort to the "Quellen" section. Rule
 * of thumb: a `user` card whose first non-empty line looks like a
 * citation header (e.g. "Art. 7 EU Space Act (COM(2025) 335)" — the
 * format the corpus picker injects) qualifies as a source card.
 */
function looksLikeSourceCard(content: string): boolean {
  const firstLine = content.split("\n").find((l) => l.trim().length > 0);
  if (!firstLine) return false;
  return (
    /^Art\.\s/i.test(firstLine) ||
    /^NIS2\s/i.test(firstLine) ||
    /\b(EU|FR|DE|IT|UK|LU|NL|BE|ES|AT|PL|DK|NO|SE|FI)\b.*\bAct\b/i.test(
      firstLine,
    ) ||
    /\bSpace\s+Act\b/i.test(firstLine) ||
    /\bLOS\b/.test(firstLine)
  );
}

interface CardOut {
  id: string;
  kind: string;
  title: string;
  content: string;
  question: string | null;
  sourceCardIds: string[];
  createdAt: Date;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "astra_chat",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
        { status: 429 },
      );
    }

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") ?? "md").toLowerCase();
    if (format !== "md") {
      return NextResponse.json(
        { error: "Only format=md supported for now" },
        { status: 400 },
      );
    }

    const ws = await prisma.atlasWorkspace.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        cards: {
          select: {
            id: true,
            kind: true,
            title: true,
            content: true,
            question: true,
            sourceCardIds: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!ws) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const cards: CardOut[] = ws.cards.map((c) => ({
      id: c.id,
      kind: c.kind,
      title: c.title,
      content: c.content,
      question: c.question,
      sourceCardIds: c.sourceCardIds,
      createdAt: c.createdAt,
    }));

    // Bucket cards into the four memo sections. We split user cards
    // into "Quellen" (corpus-picker output) and "Notizen" using the
    // citation-header heuristic so a partner reading the export sees
    // a proper "Quellen-Anhang" rather than a flat list.
    const clauseCards = cards.filter((c) => c.kind === "ai-clause");
    const answerCards = cards.filter((c) => c.kind === "ai-answer");
    const userCards = cards.filter(
      (c) => c.kind !== "ai-clause" && c.kind !== "ai-answer",
    );
    const sourceCards = userCards.filter((c) => looksLikeSourceCard(c.content));
    const noteCards = userCards.filter((c) => !looksLikeSourceCard(c.content));

    // Build the markdown document section by section. We use simple
    // ATX headings and HR separators — no extended syntax — so it
    // round-trips cleanly through Word/Outlook/PDF converters.
    const lines: string[] = [];
    lines.push(`# ${ws.title}`);
    lines.push("");
    lines.push(
      `_Atlas-Workspace · ${formatDateDe(new Date())} · ${cards.length} Karte(n)_`,
    );
    lines.push("");
    lines.push(
      "> Dieses Memo wurde aus einem Atlas-Workspace exportiert. Die zitierten Quellen liegen im Quellen-Anhang am Ende des Dokuments.",
    );
    lines.push("");
    lines.push("---");
    lines.push("");

    if (clauseCards.length > 0) {
      lines.push("## Klauseln");
      lines.push("");
      for (const c of clauseCards) {
        lines.push(`### ${c.title}`);
        lines.push("");
        lines.push(c.content);
        lines.push("");
        lines.push(
          `_Synthetisiert von Atlas am ${formatDateDe(c.createdAt)}._`,
        );
        lines.push("");
      }
      lines.push("---");
      lines.push("");
    }

    if (answerCards.length > 0) {
      lines.push("## Fragen & Antworten");
      lines.push("");
      for (const c of answerCards) {
        lines.push(`### ${c.title}`);
        lines.push("");
        if (c.question) {
          lines.push(`**Frage:** ${c.question}`);
          lines.push("");
        }
        lines.push(c.content);
        lines.push("");
        lines.push(`_Atlas-Antwort vom ${formatDateDe(c.createdAt)}._`);
        lines.push("");
      }
      lines.push("---");
      lines.push("");
    }

    if (noteCards.length > 0) {
      lines.push("## Notizen & Mandant");
      lines.push("");
      for (const c of noteCards) {
        lines.push(`### ${c.title}`);
        lines.push("");
        if (c.content.trim().length > 0) {
          lines.push(c.content);
          lines.push("");
        }
      }
      lines.push("---");
      lines.push("");
    }

    if (sourceCards.length > 0) {
      lines.push("## Quellen-Anhang");
      lines.push("");
      lines.push(
        "Die folgenden Quellen wurden aus dem Atlas-Korpus gepinnt und sind in den vorstehenden Klauseln und Antworten zitiert.",
      );
      lines.push("");
      let i = 1;
      for (const c of sourceCards) {
        lines.push(`### [${i}] ${c.title}`);
        lines.push("");
        lines.push(c.content);
        lines.push("");
        i++;
      }
    }

    const md = lines.join("\n");
    const filename = `${slug(ws.title)}.md`;

    return new NextResponse(md, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`GET /api/atlas/workspaces/[id]/export failed: ${msg}`);
    return NextResponse.json(
      { error: "Export fehlgeschlagen" },
      { status: 500 },
    );
  }
}
