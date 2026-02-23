/**
 * Generate 2.0 — Finalize Generation API
 *
 * POST /api/generate2/documents/[id]/complete
 *
 * Receives pre-parsed sections from the client and saves to DB.
 * All heavy processing (markdown parsing, marker counting) is done client-side.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

const GENERATION_MODEL = process.env.GENERATION_MODEL || "claude-sonnet-4-6";

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

const completeBodySchema = z.object({
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

    // Verify the document belongs to this user
    const doc = await prisma.nCADocument.findFirst({
      where: { id: documentId, userId: session.user.id },
      select: { id: true, status: true },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = completeBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const {
      parsedSections,
      rawContent,
      actionRequiredCount,
      evidencePlaceholderCount,
      totalInputTokens,
      totalOutputTokens,
      generationTimeMs,
    } = parsed.data;

    await prisma.nCADocument.update({
      where: { id: documentId },
      data: {
        status: "COMPLETED",
        content: JSON.parse(JSON.stringify(parsedSections)),
        rawContent: rawContent || "",
        modelUsed: GENERATION_MODEL,
        inputTokens: totalInputTokens || 0,
        outputTokens: totalOutputTokens || 0,
        generationTimeMs: generationTimeMs || 0,
        actionRequiredCount: actionRequiredCount || 0,
        evidencePlaceholderCount: evidencePlaceholderCount || 0,
      },
    });

    // Non-blocking audit log
    logAuditEvent({
      action: "DOCUMENT_GENERATED",
      userId: session.user.id,
      entityType: "NCADocument",
      entityId: documentId,
      metadata: {
        inputTokens: totalInputTokens || 0,
        outputTokens: totalOutputTokens || 0,
        generationTimeMs: generationTimeMs || 0,
        sectionCount: parsedSections.length,
        actionRequiredCount: actionRequiredCount || 0,
        evidencePlaceholderCount: evidencePlaceholderCount || 0,
        phase: "complete",
      },
    }).catch((err) =>
      console.error("[generate2/complete] Audit log failed:", err),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Finalize generation error:", error);
    const message =
      error instanceof Error ? error.message : "Finalization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
