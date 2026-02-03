import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/timeline/milestones - Create milestone
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      phaseId,
      name,
      description,
      targetDate,
      isCritical,
      isRegulatory,
      regulatoryRef,
      icon,
    } = body;

    if (!phaseId || !name || !targetDate) {
      return NextResponse.json(
        { error: "Missing required fields: phaseId, name, targetDate" },
        { status: 400 },
      );
    }

    // Verify phase ownership
    const phase = await prisma.missionPhase.findFirst({
      where: { id: phaseId, userId: session.user.id },
    });

    if (!phase) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    const milestone = await prisma.milestone.create({
      data: {
        phaseId,
        name,
        description,
        targetDate: new Date(targetDate),
        isCritical: isCritical || false,
        isRegulatory: isRegulatory || false,
        regulatoryRef,
        icon,
      },
    });

    return NextResponse.json({ success: true, milestone });
  } catch (error) {
    console.error("Error creating milestone:", error);
    return NextResponse.json(
      { error: "Failed to create milestone" },
      { status: 500 },
    );
  }
}

// PATCH /api/timeline/milestones - Update milestone
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Milestone ID required" },
        { status: 400 },
      );
    }

    // Verify ownership through phase
    const existing = await prisma.milestone.findFirst({
      where: {
        id,
        phase: {
          userId: session.user.id,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.targetDate !== undefined)
      updateData.targetDate = new Date(updates.targetDate);
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.isCritical !== undefined)
      updateData.isCritical = updates.isCritical;
    if (updates.isRegulatory !== undefined)
      updateData.isRegulatory = updates.isRegulatory;
    if (updates.regulatoryRef !== undefined)
      updateData.regulatoryRef = updates.regulatoryRef;
    if (updates.icon !== undefined) updateData.icon = updates.icon;

    // Handle completion
    if (updates.status === "COMPLETED" && existing.status !== "COMPLETED") {
      updateData.completedDate = new Date();
    }

    const milestone = await prisma.milestone.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, milestone });
  } catch (error) {
    console.error("Error updating milestone:", error);
    return NextResponse.json(
      { error: "Failed to update milestone" },
      { status: 500 },
    );
  }
}

// DELETE /api/timeline/milestones - Delete milestone
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Milestone ID required" },
        { status: 400 },
      );
    }

    // Verify ownership through phase
    const existing = await prisma.milestone.findFirst({
      where: {
        id,
        phase: {
          userId: session.user.id,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 },
      );
    }

    await prisma.milestone.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting milestone:", error);
    return NextResponse.json(
      { error: "Failed to delete milestone" },
      { status: 500 },
    );
  }
}
