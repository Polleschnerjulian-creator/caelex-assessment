/**
 * Generated Documents List API
 *
 * GET /api/documents/list — List generated documents with pagination and filters
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type {
  DocumentGenerationType,
  DocumentGenerationStatus,
} from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const documentType = searchParams.get(
      "documentType",
    ) as DocumentGenerationType | null;
    const status = searchParams.get(
      "status",
    ) as DocumentGenerationStatus | null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {
      userId: session.user.id,
    };

    if (documentType) where.documentType = documentType;
    if (status) where.status = status;

    const [documents, total] = await Promise.all([
      prisma.generatedDocument.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          documentType: true,
          title: true,
          language: true,
          status: true,
          isEdited: true,
          pdfGenerated: true,
          generationTimeMs: true,
          version: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.generatedDocument.count({ where }),
    ]);

    return NextResponse.json({
      documents,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("List generated documents error:", error);
    return NextResponse.json(
      { error: "Failed to list documents" },
      { status: 500 },
    );
  }
}
