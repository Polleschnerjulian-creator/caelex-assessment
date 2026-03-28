import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/v1/ephemeris/dependencies?entityId=X
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const entityId = request.nextUrl.searchParams.get("entityId");
    if (!entityId) {
      return NextResponse.json(
        { error: "entityId query parameter required" },
        { status: 400 },
      );
    }

    const dependencies = await prisma.entityDependency.findMany({
      where: {
        organizationId: membership.organizationId,
        isActive: true,
        OR: [{ sourceEntityId: entityId }, { targetEntityId: entityId }],
      },
      include: {
        sourceEntity: {
          select: { id: true, name: true, operatorType: true },
        },
        targetEntity: {
          select: { id: true, name: true, operatorType: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ dependencies });
  } catch (error) {
    logger.error("Failed to fetch dependencies:", error);
    return NextResponse.json(
      { error: "Failed to fetch dependencies" },
      { status: 500 },
    );
  }
}

// POST /api/v1/ephemeris/dependencies
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const body = await request.json();
    const {
      sourceEntityId,
      targetEntityId,
      dependencyType,
      strength,
      description,
      metadata,
    } = body;

    if (!sourceEntityId || !targetEntityId || !dependencyType) {
      return NextResponse.json(
        {
          error: "sourceEntityId, targetEntityId, and dependencyType required",
        },
        { status: 400 },
      );
    }

    // Validate both entities exist and belong to the same org
    const [sourceEntity, targetEntity] = await Promise.all([
      prisma.operatorEntity.findFirst({
        where: {
          id: sourceEntityId,
          organizationId: membership.organizationId,
        },
      }),
      prisma.operatorEntity.findFirst({
        where: {
          id: targetEntityId,
          organizationId: membership.organizationId,
        },
      }),
    ]);

    if (!sourceEntity || !targetEntity) {
      return NextResponse.json(
        { error: "Both entities must exist in the same organization" },
        { status: 400 },
      );
    }

    // Reject self-dependency
    if (sourceEntityId === targetEntityId) {
      return NextResponse.json(
        { error: "An entity cannot depend on itself" },
        { status: 400 },
      );
    }

    // Check for direct circular dependency (A→B and B→A with same type)
    const reverseExists = await prisma.entityDependency.findFirst({
      where: {
        sourceEntityId: targetEntityId,
        targetEntityId: sourceEntityId,
        dependencyType,
        isActive: true,
      },
    });

    if (reverseExists) {
      return NextResponse.json(
        { error: "Circular dependency detected" },
        { status: 400 },
      );
    }

    const dependency = await prisma.entityDependency.create({
      data: {
        organizationId: membership.organizationId,
        sourceEntityId,
        targetEntityId,
        dependencyType,
        strength: strength ?? "MEDIUM",
        description,
        metadata: metadata ?? undefined,
      },
      include: {
        sourceEntity: {
          select: { id: true, name: true, operatorType: true },
        },
        targetEntity: {
          select: { id: true, name: true, operatorType: true },
        },
      },
    });

    return NextResponse.json({ dependency }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Dependency already exists" },
        { status: 409 },
      );
    }
    logger.error("Failed to create dependency:", error);
    return NextResponse.json(
      { error: "Failed to create dependency" },
      { status: 500 },
    );
  }
}
