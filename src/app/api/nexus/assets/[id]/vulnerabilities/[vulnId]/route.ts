import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { updateVulnerability } from "@/lib/nexus/vulnerability-service.server";
import { UpdateVulnerabilitySchema } from "@/lib/nexus/validations";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; vulnId: string }> },
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

    const { id, vulnId } = await params;
    const organizationId = orgContext.organizationId;
    const userId = session.user.id;
    const body = await req.json();
    const parsed = UpdateVulnerabilitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const vulnerability = await updateVulnerability(
      vulnId,
      parsed.data,
      organizationId,
      userId,
    );

    // Recalculate risk score after vulnerability status change
    if (parsed.data.status || parsed.data.severity) {
      try {
        const { calculateAssetRiskScore } =
          await import("@/lib/nexus/asset-service.server");
        await calculateAssetRiskScore(id);
      } catch (err) {
        logger.warn("Failed to recalculate risk score", err);
      }
    }

    return NextResponse.json({ vulnerability });
  } catch (error) {
    logger.error("Error updating vulnerability", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; vulnId: string }> },
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

    const { id, vulnId } = await params;
    const organizationId = orgContext.organizationId;
    const userId = session.user.id;

    // Verify the vulnerability belongs to an asset in the caller's org
    const record = await prisma.assetVulnerability.findFirst({
      where: {
        id: vulnId,
        asset: { id, organizationId },
      },
    });
    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.assetVulnerability.delete({ where: { id: vulnId } });

    await logAuditEvent({
      userId,
      action: "nexus_vulnerability_deleted",
      entityType: "nexus_vulnerability",
      entityId: vulnId,
      description: "Deleted vulnerability",
      organizationId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting vulnerability", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
