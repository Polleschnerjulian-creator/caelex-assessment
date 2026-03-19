import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/v1/verity/audit-chain/[operatorId]
 * Auth required. Returns paginated audit chain entries for the given operatorId
 * (organizationId). The caller's organization must match the operatorId.
 *
 * Query params:
 *   from  — inclusive lower bound sequence number (defaults to 1)
 *   to    — inclusive upper bound sequence number (defaults to no limit)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operatorId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { operatorId } = await params;

    // Verify the caller belongs to the requested organization
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership || membership.organizationId !== operatorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse pagination query params
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const from = fromParam ? parseInt(fromParam, 10) : 1;
    const to = toParam ? parseInt(toParam, 10) : undefined;

    if (isNaN(from) || from < 1) {
      return NextResponse.json(
        { error: "Invalid 'from' parameter — must be a positive integer" },
        { status: 400 },
      );
    }

    if (to !== undefined && (isNaN(to) || to < from)) {
      return NextResponse.json(
        {
          error:
            "Invalid 'to' parameter — must be a positive integer >= 'from'",
        },
        { status: 400 },
      );
    }

    const entries = await prisma.verityAuditChainEntry.findMany({
      where: {
        organizationId: operatorId,
        sequenceNumber: {
          gte: from,
          ...(to !== undefined ? { lte: to } : {}),
        },
      },
      orderBy: { sequenceNumber: "asc" },
      select: {
        id: true,
        organizationId: true,
        sequenceNumber: true,
        eventType: true,
        entityId: true,
        entityType: true,
        eventData: true,
        entryHash: true,
        previousHash: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      operatorId,
      from,
      to: to ?? null,
      count: entries.length,
      entries,
    });
  } catch (error) {
    console.error("[audit-chain/[operatorId]]", error);
    return NextResponse.json(
      { error: "Failed to retrieve audit chain entries" },
      { status: 500 },
    );
  }
}
