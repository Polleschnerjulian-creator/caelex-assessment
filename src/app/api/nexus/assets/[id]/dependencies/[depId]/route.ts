import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { removeDependency } from "@/lib/nexus/dependency-service.server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; depId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgContext = await getCurrentOrganization(session.user.id);
    if (!orgContext?.organizationId) {
      return NextResponse.json(
        { error: "Organization required" },
        { status: 403 },
      );
    }

    const rl = await checkRateLimit(
      "sensitive",
      getIdentifier(req, session.user.id),
    );
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id, depId } = await params;
    const organizationId = orgContext.organizationId;
    const userId = session.user.id;

    await removeDependency(depId, organizationId, userId);

    void id;
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error removing dependency", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
