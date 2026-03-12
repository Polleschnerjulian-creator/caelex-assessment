import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getUserOrgId } from "@/lib/hub/queries";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await params;
    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    // Look up label and verify it belongs to user's org
    const label = await prisma.hubLabel.findFirst({
      where: { id, project: { organizationId: orgId } },
      select: { id: true },
    });
    if (!label) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    await prisma.hubLabel.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[hub/labels/[id]] DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
