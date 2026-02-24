/**
 * Assure Risk Detail API
 * PUT: Update a risk. Check ownership.
 * DELETE: Delete a risk. Check ownership.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";
import { riskSchema } from "@/lib/assure/validations";

export const runtime = "nodejs";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];

const PROBABILITY_VALUES: Record<string, number> = {
  VERY_LOW: 1,
  LOW: 2,
  MODERATE: 3,
  HIGH: 4,
  VERY_HIGH: 5,
};

const IMPACT_VALUES: Record<string, number> = {
  NEGLIGIBLE: 1,
  MINOR: 2,
  MODERATE_IMPACT: 3,
  MAJOR: 4,
  CATASTROPHIC: 5,
};

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

    const existingRisk = await prisma.assureRisk.findUnique({ where: { id } });
    if (!existingRisk) {
      return NextResponse.json({ error: "Risk not found" }, { status: 404 });
    }
    if (existingRisk.organizationId !== membership.organizationId) {
      return NextResponse.json({ error: "Risk not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = riskSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Recalculate risk score if probability or impact changed
    const probability = data.probability ?? existingRisk.probability;
    const impact = data.impact ?? existingRisk.impact;
    const riskScore =
      (PROBABILITY_VALUES[probability] || 3) * (IMPACT_VALUES[impact] || 3);

    // Build update payload, converting null JSON fields for Prisma
    const updateData: Record<string, unknown> = { ...data, riskScore };
    if (data.mitigationEvidence === null) {
      updateData.mitigationEvidence = Prisma.JsonNull;
    }
    if (data.triggerEvents === null) {
      updateData.triggerEvents = Prisma.JsonNull;
    }
    if (data.earlyWarnings === null) {
      updateData.earlyWarnings = Prisma.JsonNull;
    }

    const updatedRisk = await prisma.assureRisk.update({
      where: { id },
      data: updateData as Prisma.AssureRiskUpdateInput,
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "assure_risk_updated",
      entityType: "assure_risk",
      entityId: id,
      previousValue: {
        title: existingRisk.title,
        probability: existingRisk.probability,
        impact: existingRisk.impact,
        riskScore: existingRisk.riskScore,
      },
      newValue: {
        title: updatedRisk.title,
        probability: updatedRisk.probability,
        impact: updatedRisk.impact,
        riskScore: updatedRisk.riskScore,
      },
      metadata: { changes: Object.keys(data) },
      organizationId: membership.organizationId,
    });

    return NextResponse.json(updatedRisk);
  } catch (error) {
    console.error("Assure risk update error:", error);
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

    const existingRisk = await prisma.assureRisk.findUnique({ where: { id } });
    if (!existingRisk) {
      return NextResponse.json({ error: "Risk not found" }, { status: 404 });
    }
    if (existingRisk.organizationId !== membership.organizationId) {
      return NextResponse.json({ error: "Risk not found" }, { status: 404 });
    }

    await prisma.assureRisk.delete({ where: { id } });

    await logAuditEvent({
      userId: session.user.id,
      action: "assure_risk_deleted",
      entityType: "assure_risk",
      entityId: id,
      metadata: {
        title: existingRisk.title,
        category: existingRisk.category,
      },
      organizationId: membership.organizationId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Assure risk delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
