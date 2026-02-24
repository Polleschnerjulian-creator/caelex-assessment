/**
 * Assure Milestones API
 * GET: List milestones for the org.
 * POST: Create a new milestone (validate with milestoneSchema).
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";
import { milestoneSchema } from "@/lib/assure/validations";

export const runtime = "nodejs";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identifier = getIdentifier(request, session.user.id);
    const rateLimit = await checkRateLimit("assure", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    if (!MANAGER_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires MANAGER role or above." },
        { status: 403 },
      );
    }

    const milestones = await prisma.assureMilestone.findMany({
      where: { organizationId: membership.organizationId },
      orderBy: [{ targetDate: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ milestones });
  } catch (error) {
    console.error("Assure milestones list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identifier = getIdentifier(request, session.user.id);
    const rateLimit = await checkRateLimit("assure", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    if (!MANAGER_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires MANAGER role or above." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = milestoneSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (!data.title || !data.category || !data.targetDate) {
      return NextResponse.json(
        { error: "title, category, and targetDate are required" },
        { status: 400 },
      );
    }

    const milestone = await prisma.assureMilestone.create({
      data: {
        organizationId: membership.organizationId,
        title: data.title,
        description: data.description ?? null,
        category: data.category,
        targetDate: new Date(data.targetDate),
        completedDate: data.completedDate ? new Date(data.completedDate) : null,
        status: data.status ?? "ON_TRACK",
        evidence: data.evidence ?? Prisma.JsonNull,
        isInvestorVisible: data.isInvestorVisible ?? true,
        investorNote: data.investorNote ?? null,
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "assure_milestone_created",
      entityType: "assure_milestone",
      entityId: milestone.id,
      metadata: {
        title: data.title,
        category: data.category,
        targetDate: data.targetDate,
      },
      organizationId: membership.organizationId,
    });

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    console.error("Assure milestone create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
