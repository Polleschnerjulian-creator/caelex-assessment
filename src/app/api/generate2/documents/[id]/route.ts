/**
 * Generate 2.0 — Single Document API
 *
 * GET    /api/generate2/documents/[id] — Get document details
 * PATCH  /api/generate2/documents/[id] — Update edited content
 * DELETE /api/generate2/documents/[id] — Delete document
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/ratelimit";
import { z } from "zod";

// C-3: Zod schema for editedContent validation
const editedContentSchema = z.array(
  z.object({
    type: z.string(),
    value: z.string(),
  }),
);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // H-1: Rate limiting
    const rateLimitResult = await checkRateLimit(
      "generate2",
      `generate2:${userId}`,
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    // C-2: Organization membership check
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No Organization" }, { status: 403 });
    }

    const { id } = await params;

    // C-1: Use select to exclude rawContent from the response
    // C-2: Add organizationId to where clause
    const doc = await prisma.nCADocument.findFirst({
      where: { id, userId, organizationId: membership.organizationId },
      select: {
        id: true,
        title: true,
        content: true,
        editedContent: true,
        isEdited: true,
        status: true,
        documentType: true,
        pdfGenerated: true,
        pdfGeneratedAt: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        organizationId: true,
      },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ document: doc });
  } catch (error) {
    logger.error("Generate2 get error", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // H-1: Rate limiting
    const rateLimitResult = await checkRateLimit(
      "generate2",
      `generate2:${userId}`,
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    // C-2: Organization membership check
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No Organization" }, { status: 403 });
    }

    const { id } = await params;

    // C-3: Max body size check
    const rawBody = await request.text();
    if (rawBody.length > 500000) {
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 },
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { editedContent } = body as { editedContent: unknown };

    // C-3: Validate editedContent with Zod
    const parseResult = editedContentSchema.safeParse(editedContent);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid editedContent format",
          details: parseResult.error.issues,
        },
        { status: 400 },
      );
    }

    // C-2: Add organizationId to where clause
    const doc = await prisma.nCADocument.findFirst({
      where: { id, userId, organizationId: membership.organizationId },
      select: { id: true },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const updated = await prisma.nCADocument.update({
      where: { id, userId },
      data: {
        editedContent: parseResult.data as object,
        isEdited: true,
      },
    });

    return NextResponse.json({ document: updated });
  } catch (error) {
    logger.error("Generate2 patch error", error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // H-1: Rate limiting
    const rateLimitResult = await checkRateLimit(
      "generate2",
      `generate2:${userId}`,
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    // C-2: Organization membership check
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No Organization" }, { status: 403 });
    }

    const { id } = await params;

    // C-2: Add organizationId to where clause
    const doc = await prisma.nCADocument.findFirst({
      where: { id, userId, organizationId: membership.organizationId },
      select: { id: true },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    await prisma.nCADocument.delete({ where: { id, userId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Generate2 delete error", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 },
    );
  }
}
