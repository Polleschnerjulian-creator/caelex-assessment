import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submitNIS2Phase } from "@/lib/services/incident-autopilot";

// GET /api/supervision/incidents/[id]/nis2-phases — All NIS2 phases with deadlines
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const config = await prisma.supervisionConfig.findUnique({
      where: { userId: session.user.id },
    });

    if (!config) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const incident = await prisma.incident.findFirst({
      where: { id, supervisionId: config.id },
      select: { id: true },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 },
      );
    }

    const phases = await prisma.incidentNIS2Phase.findMany({
      where: { incidentId: id },
      orderBy: { deadline: "asc" },
    });

    const now = Date.now();

    const phaseData = phases.map((phase) => {
      const deadlineMs = phase.deadline.getTime();
      const createdMs = phase.createdAt.getTime();
      const totalMs = deadlineMs - createdMs;
      const remainingMs = Math.max(0, deadlineMs - now);
      const isSubmitted = phase.status === "submitted";
      const isOverdue = !isSubmitted && now > deadlineMs;

      return {
        phase: phase.phase,
        deadline: phase.deadline.toISOString(),
        status: isOverdue ? "overdue" : phase.status,
        submittedAt: phase.submittedAt?.toISOString() || null,
        referenceNumber: phase.referenceNumber,
        countdown: {
          totalMs,
          remainingMs,
          percentRemaining:
            totalMs > 0 ? Math.round((remainingMs / totalMs) * 100) : 0,
          isOverdue,
          isSubmitted,
        },
      };
    });

    return NextResponse.json({ phases: phaseData });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to get phases",
      },
      { status: 500 },
    );
  }
}

// PATCH /api/supervision/incidents/[id]/nis2-phases — Submit a phase
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const nis2PhaseSchema = z.object({
      phase: z.string().min(1),
      referenceNumber: z.string().optional(),
    });

    const body = await req.json();
    const parsed = nis2PhaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { phase, referenceNumber } = parsed.data;

    // Verify ownership
    const config = await prisma.supervisionConfig.findUnique({
      where: { userId: session.user.id },
    });

    if (!config) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const incident = await prisma.incident.findFirst({
      where: { id, supervisionId: config.id },
      select: { id: true },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 },
      );
    }

    const result = await submitNIS2Phase(
      id,
      phase,
      session.user.id,
      referenceNumber,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to submit phase",
      },
      { status: 500 },
    );
  }
}
