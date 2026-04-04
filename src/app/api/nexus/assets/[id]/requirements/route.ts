import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { BulkCreateRequirementsSchema } from "@/lib/nexus/validations";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
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

    const rl = await checkRateLimit("api", getIdentifier(req, session.user.id));
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    const organizationId = orgContext.organizationId;
    const requirements = await prisma.assetRequirement.findMany({
      where: { assetId: id, asset: { organizationId } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ requirements });
  } catch (error) {
    logger.error("Error fetching requirements", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
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

    const { id } = await params;
    const organizationId = orgContext.organizationId;
    const userId = session.user.id;
    const body = await req.json();
    const parsed = BulkCreateRequirementsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await prisma.assetRequirement.createMany({
      data: parsed.data.requirements.map((r) => ({
        assetId: id,
        regulationFramework: r.regulationFramework,
        requirementId: r.requirementId,
        requirementLabel: r.requirementLabel,
        status: r.status,
      })),
      skipDuplicates: true,
    });

    await logAuditEvent({
      userId,
      action: "nexus_requirement_synced",
      entityType: "nexus_asset",
      entityId: id,
      description: `Bulk created ${result.count} requirements`,
      organizationId,
    });

    return NextResponse.json({ count: result.count }, { status: 201 });
  } catch (error) {
    logger.error("Error creating requirements", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
