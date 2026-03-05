/**
 * Generate 2.0 — Finalize Generation API
 *
 * POST /api/generate2/documents/[id]/complete
 *
 * Two modes:
 * 1. Lightweight (preferred): Client sends only metrics. Server reconstructs
 *    the final document from the sections already saved during generation.
 * 2. Full (fallback): Client sends parsedSections + rawContent.
 *
 * Sections are saved incrementally by the section endpoint, so the DB already
 * has all content by the time this endpoint is called.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { parseSectionsFromMarkdown } from "@/lib/generate/parse-sections";
import { logger } from "@/lib/logger";

const GENERATION_MODEL = process.env.GENERATION_MODEL || "claude-sonnet-4-6";

// Schema for lightweight mode (preferred) — no content, just metrics
const lightweightBodySchema = z.object({
  mode: z.literal("reconstruct"),
  totalInputTokens: z.number().int().min(0),
  totalOutputTokens: z.number().int().min(0),
  generationTimeMs: z.number().int().min(0),
});

// Schema for full mode (fallback) — client sends everything
const sectionContentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), value: z.string() }),
  z.object({
    type: z.literal("heading"),
    value: z.string(),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  }),
  z.object({
    type: z.literal("list"),
    items: z.array(z.string()),
    ordered: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("table"),
    headers: z.array(z.string()),
    rows: z.array(z.array(z.string())),
  }),
  z.object({
    type: z.literal("keyValue"),
    items: z.array(z.object({ key: z.string(), value: z.string() })),
  }),
  z.object({ type: z.literal("spacer"), height: z.number().optional() }),
  z.object({ type: z.literal("divider") }),
  z.object({
    type: z.literal("alert"),
    severity: z.enum(["info", "warning", "error"]),
    message: z.string(),
  }),
]);

const fullBodySchema = z.object({
  parsedSections: z.array(
    z.object({
      title: z.string(),
      content: z.array(sectionContentSchema),
    }),
  ),
  rawContent: z.string(),
  actionRequiredCount: z.number().int().min(0),
  evidencePlaceholderCount: z.number().int().min(0),
  totalInputTokens: z.number().int().min(0),
  totalOutputTokens: z.number().int().min(0),
  generationTimeMs: z.number().int().min(0),
});

export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: documentId } = await params;

    // Load the document with its incrementally-saved section content
    const doc = await prisma.nCADocument.findFirst({
      where: { id: documentId, userId: session.user.id },
      select: { id: true, status: true, content: true },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const body = await request.json();

    let finalContent: unknown;
    let rawContent: string;
    let actionRequiredCount: number;
    let evidencePlaceholderCount: number;
    let totalInputTokens: number;
    let totalOutputTokens: number;
    let generationTimeMs: number;
    let sectionCount: number;

    const lightweightParsed = lightweightBodySchema.safeParse(body);

    if (lightweightParsed.success) {
      // ── Lightweight mode: reconstruct from saved sections ──
      const savedSections = Array.isArray(doc.content) ? doc.content : [];
      const rawParts: string[] = [];

      for (const section of savedSections) {
        const s = section as { raw?: string; title?: string };
        if (s?.raw && typeof s.raw === "string") {
          rawParts.push(s.raw);
        }
      }

      if (rawParts.length === 0) {
        return NextResponse.json(
          {
            error:
              "No saved sections found — use full mode with parsedSections",
          },
          { status: 400 },
        );
      }

      rawContent = rawParts.join("\n\n");

      // Server-side parse — fast, pure string/regex operations
      const parsedSections = parseSectionsFromMarkdown(rawContent);
      finalContent =
        parsedSections.length > 0
          ? parsedSections
          : [
              {
                title: "Generated Content",
                content: [
                  { type: "text", value: rawContent.substring(0, 50000) },
                ],
              },
            ];

      actionRequiredCount = (
        rawContent.match(/\[ACTION REQUIRED[^\]]*\]/g) || []
      ).length;
      evidencePlaceholderCount = (rawContent.match(/\[EVIDENCE[^\]]*\]/g) || [])
        .length;
      totalInputTokens = lightweightParsed.data.totalInputTokens;
      totalOutputTokens = lightweightParsed.data.totalOutputTokens;
      generationTimeMs = lightweightParsed.data.generationTimeMs;
      sectionCount = Array.isArray(finalContent)
        ? (finalContent as unknown[]).length
        : 0;
    } else {
      // ── Full mode (fallback): client sent everything ──
      const fullParsed = fullBodySchema.safeParse(body);
      if (!fullParsed.success) {
        return NextResponse.json(
          {
            error: "Invalid request body",
            details: fullParsed.error.flatten().fieldErrors,
          },
          { status: 400 },
        );
      }

      finalContent = JSON.parse(JSON.stringify(fullParsed.data.parsedSections));
      rawContent = fullParsed.data.rawContent;
      actionRequiredCount = fullParsed.data.actionRequiredCount;
      evidencePlaceholderCount = fullParsed.data.evidencePlaceholderCount;
      totalInputTokens = fullParsed.data.totalInputTokens;
      totalOutputTokens = fullParsed.data.totalOutputTokens;
      generationTimeMs = fullParsed.data.generationTimeMs;
      sectionCount = fullParsed.data.parsedSections.length;
    }

    await prisma.nCADocument.update({
      where: { id: documentId },
      data: {
        status: "COMPLETED",
        content: finalContent as never,
        rawContent,
        modelUsed: GENERATION_MODEL,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        generationTimeMs,
        actionRequiredCount,
        evidencePlaceholderCount,
      },
    });

    // Non-blocking audit log
    logAuditEvent({
      action: "DOCUMENT_GENERATED",
      userId: session.user.id,
      entityType: "NCADocument",
      entityId: documentId,
      metadata: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        generationTimeMs,
        sectionCount,
        actionRequiredCount,
        evidencePlaceholderCount,
        phase: "complete",
      },
    }).catch((err) =>
      logger.error("[generate2/complete] Audit log failed", err),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[generate2/complete] Finalize error", error);
    return NextResponse.json({ error: "Finalization failed" }, { status: 500 });
  }
}
