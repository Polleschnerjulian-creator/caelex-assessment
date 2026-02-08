import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyChain } from "@/lib/audit-hash.server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve organization
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      orderBy: { joinedAt: "desc" },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    // Parse optional date range from query params
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;

    // Run verification
    const result = await verifyChain(
      membership.organizationId,
      startDate,
      endDate,
    );

    // Log the verification event
    const ctx = getRequestContext(request);
    await logAuditEvent({
      userId: session.user.id,
      action: "hash_chain_verified",
      entityType: "compliance_evidence",
      entityId: membership.organizationId,
      newValue: {
        valid: result.valid,
        checkedEntries: result.checkedEntries,
        brokenAt: result.brokenAt?.entryId || null,
      },
      description: result.valid
        ? `Hash chain verified: ${result.checkedEntries} entries OK`
        : `Hash chain broken at entry ${result.brokenAt?.entryId}`,
      ...ctx,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Hash chain verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify hash chain" },
      { status: 500 },
    );
  }
}
