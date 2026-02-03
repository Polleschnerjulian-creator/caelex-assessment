import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/timeline/mission-phases - List mission phases
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const missionId = searchParams.get("missionId");

    const where: Record<string, unknown> = { userId: session.user.id };
    if (missionId) {
      where.missionId = missionId;
    }

    const phases = await prisma.missionPhase.findMany({
      where,
      include: {
        milestones: {
          orderBy: { targetDate: "asc" },
        },
      },
      orderBy: { startDate: "asc" },
    });

    // Group by mission
    const missionMap: Record<
      string,
      {
        missionId: string;
        missionName: string | null;
        phases: typeof phases;
      }
    > = {};

    for (const phase of phases) {
      if (!missionMap[phase.missionId]) {
        missionMap[phase.missionId] = {
          missionId: phase.missionId,
          missionName: phase.missionName,
          phases: [],
        };
      }
      missionMap[phase.missionId].phases.push(phase);
    }

    return NextResponse.json({
      phases,
      byMission: Object.values(missionMap),
    });
  } catch (error) {
    console.error("Error fetching mission phases:", error);
    return NextResponse.json(
      { error: "Failed to fetch mission phases" },
      { status: 500 },
    );
  }
}

// POST /api/timeline/mission-phases - Create new mission phase
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      missionId,
      missionName,
      name,
      description,
      startDate,
      endDate,
      status,
      color,
      dependsOn,
      milestones,
    } = body;

    if (!missionId || !name || !startDate || !endDate) {
      return NextResponse.json(
        {
          error: "Missing required fields: missionId, name, startDate, endDate",
        },
        { status: 400 },
      );
    }

    const phase = await prisma.missionPhase.create({
      data: {
        userId: session.user.id,
        missionId,
        missionName,
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status || "PLANNED",
        color,
        dependsOn: dependsOn || [],
        milestones: milestones
          ? {
              create: milestones.map(
                (m: {
                  name: string;
                  description?: string;
                  targetDate: string;
                  isCritical?: boolean;
                  isRegulatory?: boolean;
                  regulatoryRef?: string;
                  icon?: string;
                }) => ({
                  name: m.name,
                  description: m.description,
                  targetDate: new Date(m.targetDate),
                  isCritical: m.isCritical || false,
                  isRegulatory: m.isRegulatory || false,
                  regulatoryRef: m.regulatoryRef,
                  icon: m.icon,
                }),
              ),
            }
          : undefined,
      },
      include: {
        milestones: true,
      },
    });

    return NextResponse.json({ success: true, phase });
  } catch (error) {
    console.error("Error creating mission phase:", error);
    return NextResponse.json(
      { error: "Failed to create mission phase" },
      { status: 500 },
    );
  }
}

// PATCH /api/timeline/mission-phases - Update mission phase
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Phase ID required" }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.missionPhase.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.startDate !== undefined)
      updateData.startDate = new Date(updates.startDate);
    if (updates.endDate !== undefined)
      updateData.endDate = new Date(updates.endDate);
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.progress !== undefined) updateData.progress = updates.progress;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.dependsOn !== undefined)
      updateData.dependsOn = updates.dependsOn;

    const phase = await prisma.missionPhase.update({
      where: { id },
      data: updateData,
      include: {
        milestones: true,
      },
    });

    return NextResponse.json({ success: true, phase });
  } catch (error) {
    console.error("Error updating mission phase:", error);
    return NextResponse.json(
      { error: "Failed to update mission phase" },
      { status: 500 },
    );
  }
}

// DELETE /api/timeline/mission-phases - Delete mission phase
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Phase ID required" }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.missionPhase.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    await prisma.missionPhase.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting mission phase:", error);
    return NextResponse.json(
      { error: "Failed to delete mission phase" },
      { status: 500 },
    );
  }
}
