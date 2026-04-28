/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 *   GET /api/atlas/workspaces/[id]/export?format=md|pdf
 *
 * Outbound: turns a workspace into a versendbares Deliverable. The
 * pinboard is great for thinking-while-drafting; this endpoint turns
 * the result into a memo a lawyer can paste into Word, send to a
 * partner, or attach to a license application.
 *
 *   format=md   universal intermediate — Word imports it, Pandoc
 *               converts to PDF, GitHub renders it, mail clients keep
 *               the structure.
 *   format=pdf  legal-memo PDF rendered server-side via @react-pdf/
 *               renderer. Drop-in deliverable to send to NCAs / clients
 *               / partners. Helvetica / navy / footnoted citations.
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
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

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

// ─── PDF styles ───────────────────────────────────────────────────────
//
// Caelex-navy + slate palette — matches the marketing/dashboard look
// so a memo printed from Atlas reads as part of the same product.
// Helvetica because @react-pdf supports it natively; bringing in a
// custom TTF would inflate the cold-start by ~300KB.

const pdfStyles = StyleSheet.create({
  page: {
    padding: "48 56 64 56",
    fontSize: 10.5,
    fontFamily: "Helvetica",
    color: "#1A202C",
    lineHeight: 1.55,
  },
  header: {
    marginBottom: 24,
    paddingBottom: 12,
    borderBottom: "2pt solid #1E3A5F",
  },
  brand: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1E3A5F",
    letterSpacing: 3,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#0A0F1E",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#718096",
  },
  intro: {
    fontSize: 9.5,
    color: "#4A5568",
    fontStyle: "italic",
    marginBottom: 18,
    paddingLeft: 8,
    borderLeft: "2pt solid #CBD5E0",
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1E3A5F",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 12,
    paddingBottom: 4,
    borderBottom: "1pt solid #E2E8F0",
  },
  card: {
    marginBottom: 14,
    paddingLeft: 4,
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1A202C",
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 10.5,
    color: "#2D3748",
    marginBottom: 6,
  },
  cardMeta: {
    fontSize: 8.5,
    color: "#A0AEC0",
    fontStyle: "italic",
  },
  question: {
    backgroundColor: "#F7FAFC",
    borderLeft: "2pt solid #38A169",
    padding: "5 8",
    marginBottom: 8,
    flexDirection: "row",
  },
  questionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#22543D",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginRight: 5,
    marginTop: 1,
  },
  questionBody: {
    fontSize: 10,
    color: "#2D3748",
    fontStyle: "italic",
    flex: 1,
  },
  sourceIntro: {
    fontSize: 9.5,
    color: "#4A5568",
    marginBottom: 12,
  },
  sourceCard: {
    marginBottom: 10,
    paddingLeft: 4,
  },
  sourceTitle: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: "#1E3A5F",
    marginBottom: 4,
  },
  sourceBody: {
    fontSize: 9.5,
    color: "#4A5568",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    fontSize: 8,
    color: "#A0AEC0",
    textAlign: "center",
    borderTop: "0.5pt solid #E2E8F0",
    paddingTop: 8,
  },
});

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
    if (format !== "md" && format !== "pdf") {
      return NextResponse.json(
        { error: "Only format=md or format=pdf supported" },
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

    // ─── PDF branch ─────────────────────────────────────────────────
    // Server-side render via @react-pdf/renderer. Same section order
    // as the markdown export so a lawyer who exported markdown earlier
    // sees the same structure in the PDF — predictable mental model.
    if (format === "pdf") {
      const doc = (
        <Document
          author="Atlas"
          title={ws.title}
          subject="Atlas-Workspace Memo"
          creator="Caelex Atlas"
        >
          <Page size="A4" style={pdfStyles.page}>
            <View style={pdfStyles.header}>
              <Text style={pdfStyles.brand}>ATLAS</Text>
              <Text style={pdfStyles.title}>{ws.title}</Text>
              <Text style={pdfStyles.subtitle}>
                Atlas-Workspace · {formatDateDe(new Date())} · {cards.length}{" "}
                Karte(n)
              </Text>
            </View>
            <Text style={pdfStyles.intro}>
              Dieses Memo wurde aus einem Atlas-Workspace exportiert. Die
              zitierten Quellen liegen im Quellen-Anhang am Ende des Dokuments.
            </Text>

            {clauseCards.length > 0 && (
              <View style={pdfStyles.section}>
                <Text style={pdfStyles.sectionTitle}>Klauseln</Text>
                {clauseCards.map((c) => (
                  <View key={c.id} style={pdfStyles.card} wrap={true}>
                    <Text style={pdfStyles.cardTitle}>{c.title}</Text>
                    <Text style={pdfStyles.cardBody}>{c.content}</Text>
                    <Text style={pdfStyles.cardMeta}>
                      Synthetisiert von Atlas am {formatDateDe(c.createdAt)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {answerCards.length > 0 && (
              <View style={pdfStyles.section}>
                <Text style={pdfStyles.sectionTitle}>Fragen & Antworten</Text>
                {answerCards.map((c) => (
                  <View key={c.id} style={pdfStyles.card} wrap={true}>
                    <Text style={pdfStyles.cardTitle}>{c.title}</Text>
                    {c.question && (
                      <View style={pdfStyles.question}>
                        <Text style={pdfStyles.questionLabel}>Frage:</Text>
                        <Text style={pdfStyles.questionBody}>{c.question}</Text>
                      </View>
                    )}
                    <Text style={pdfStyles.cardBody}>{c.content}</Text>
                    <Text style={pdfStyles.cardMeta}>
                      Atlas-Antwort vom {formatDateDe(c.createdAt)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {noteCards.length > 0 && (
              <View style={pdfStyles.section}>
                <Text style={pdfStyles.sectionTitle}>Notizen & Mandant</Text>
                {noteCards.map((c) => (
                  <View key={c.id} style={pdfStyles.card} wrap={true}>
                    <Text style={pdfStyles.cardTitle}>{c.title}</Text>
                    {c.content.trim().length > 0 && (
                      <Text style={pdfStyles.cardBody}>{c.content}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {sourceCards.length > 0 && (
              <View style={pdfStyles.section} break>
                <Text style={pdfStyles.sectionTitle}>Quellen-Anhang</Text>
                <Text style={pdfStyles.sourceIntro}>
                  Die folgenden Quellen wurden aus dem Atlas-Korpus gepinnt und
                  sind in den vorstehenden Klauseln und Antworten zitiert.
                </Text>
                {sourceCards.map((c, i) => (
                  <View key={c.id} style={pdfStyles.sourceCard} wrap={true}>
                    <Text style={pdfStyles.sourceTitle}>
                      [{i + 1}] {c.title}
                    </Text>
                    <Text style={pdfStyles.sourceBody}>{c.content}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text
              style={pdfStyles.footer}
              fixed
              render={({ pageNumber, totalPages }) =>
                `Atlas-Workspace · Seite ${pageNumber}/${totalPages}`
              }
            />
          </Page>
        </Document>
      );

      // Render the PDF to a Node Buffer. @react-pdf/renderer's
      // toBuffer is async — we await the full bytes before returning
      // so we can set Content-Length cleanly. For very large
      // workspaces this might want to switch to streaming, but at
      // <50 cards / <8000 chars each we're safely under 1MB.
      const stream = await pdf(doc).toBuffer();
      const chunks: Buffer[] = [];
      for await (const chunk of stream as AsyncIterable<Buffer>) {
        chunks.push(chunk);
      }
      const buf = Buffer.concat(chunks);
      const filename = `${slug(ws.title)}.pdf`;

      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(buf.length),
          "Cache-Control": "no-store",
        },
      });
    }

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
