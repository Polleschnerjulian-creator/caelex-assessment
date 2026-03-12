import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getUserOrgId } from "@/lib/hub/queries";
import { createProjectSchema } from "@/lib/hub/validations";

export async function GET(request: NextRequest) {
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

    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const projects = await prisma.hubProject.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, name: true, image: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
          take: 20,
        },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch per-project task status counts
    const projectIds = projects.map((p) => p.id);
    const taskStatusCounts = await prisma.hubTask.groupBy({
      by: ["projectId", "status"],
      where: { projectId: { in: projectIds } },
      _count: { status: true },
    });

    // Build a map: projectId -> { status: count }
    const statusCountMap: Record<string, Record<string, number>> = {};
    for (const row of taskStatusCounts) {
      if (!statusCountMap[row.projectId]) statusCountMap[row.projectId] = {};
      statusCountMap[row.projectId][row.status] = row._count.status;
    }

    const result = projects.map((p) => ({
      ...p,
      taskStatusCounts: statusCountMap[p.id] ?? {},
    }));

    return NextResponse.json({ projects: result });
  } catch (err) {
    console.error("[hub/projects] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, description, color } = parsed.data;

    const project = await prisma.hubProject.create({
      data: {
        name,
        description,
        color,
        organizationId: orgId,
        ownerId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: "ADMIN",
          },
        },
      },
      include: {
        owner: {
          select: { id: true, name: true, image: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    console.error("[hub/projects] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
