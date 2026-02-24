/**
 * Assure Milestone Detail API
 * PUT: Update a milestone.
 * DELETE: Delete a milestone.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";
import { milestoneSchema } from "@/lib/assure/validations";

export const runtime = "nodejs";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
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

    const { id } = await params;

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

    const existing = await prisma.assureMilestone.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 },
      );
    }
    if (existing.organizationId !== membership.organizationId) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = milestoneSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.targetDate !== undefined)
      updateData.targetDate = new Date(data.targetDate);
    if (data.completedDate !== undefined) {
      updateData.completedDate = data.completedDate
        ? new Date(data.completedDate)
        : null;
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (data.evidence !== undefined) updateData.evidence = data.evidence;
    if (data.isInvestorVisible !== undefined)
      updateData.isInvestorVisible = data.isInvestorVisible;
    if (data.investorNote !== undefined)
      updateData.investorNote = data.investorNote;

    const updated = await prisma.assureMilestone.update({
      where: { id },
      data: updateData,
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "assure_milestone_updated",
      entityType: "assure_milestone",
      entityId: id,
      previousValue: {
        title: existing.title,
        status: existing.status,
      },
      newValue: {
        title: updated.title,
        status: updated.status,
      },
      metadata: { changes: Object.keys(updateData) },
      organizationId: membership.organizationId,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Assure milestone update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
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

    const { id } = await params;

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

    const existing = await prisma.assureMilestone.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 },
      );
    }
    if (existing.organizationId !== membership.organizationId) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 },
      );
    }

    await prisma.assureMilestone.delete({ where: { id } });

    await logAuditEvent({
      userId: session.user.id,
      action: "assure_milestone_deleted",
      entityType: "assure_milestone",
      entityId: id,
      metadata: {
        title: existing.title,
        category: existing.category,
      },
      organizationId: membership.organizationId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Assure milestone delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
