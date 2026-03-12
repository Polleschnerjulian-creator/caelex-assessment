import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getUserOrgId } from "@/lib/hub/queries";
import { createCalendarEventSchema } from "@/lib/hub/validations";

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

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = { organizationId: orgId };
    if (from || to) {
      where.date = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const events = await prisma.hubCalendarEvent.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, image: true } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ events });
  } catch (err) {
    console.error("[hub/calendar-events] GET error:", err);
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
    const parsed = createCalendarEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { title, description, date, startTime, endTime, color } = parsed.data;

    const event = await prisma.hubCalendarEvent.create({
      data: {
        organizationId: orgId,
        title,
        description: description ?? null,
        date,
        startTime: startTime ?? null,
        endTime: endTime ?? null,
        color: color ?? "#3B82F6",
        creatorId: session.user.id,
      },
      include: {
        creator: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    console.error("[hub/calendar-events] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
