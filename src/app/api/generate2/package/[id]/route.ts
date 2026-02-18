/**
 * Generate 2.0 — Package Status API
 *
 * GET /api/generate2/package/[id] — Get package status with document list
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

    const pkg = await prisma.nCADocPackage.findFirst({
      where: { id, userId: session.user.id },
      include: {
        documents: {
          select: {
            id: true,
            documentType: true,
            title: true,
            status: true,
            readinessScore: true,
            actionRequiredCount: true,
            generationTimeMs: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json({ package: pkg });
  } catch (error) {
    console.error("Package status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch package" },
      { status: 500 },
    );
  }
}
