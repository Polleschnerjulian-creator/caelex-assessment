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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const doc = await prisma.nCADocument.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error("Generate2 get error:", error);
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

    const { id } = await params;

    const doc = await prisma.nCADocument.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { editedContent } = body as { editedContent: unknown };

    const updated = await prisma.nCADocument.update({
      where: { id },
      data: {
        editedContent: editedContent as object,
        isEdited: true,
      },
    });

    return NextResponse.json({ document: updated });
  } catch (error) {
    console.error("Generate2 patch error:", error);
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

    const { id } = await params;

    const doc = await prisma.nCADocument.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    await prisma.nCADocument.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Generate2 delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 },
    );
  }
}
