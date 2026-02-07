/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * NIS2 Requirement Status Tracking API
 *
 * GET   /api/nis2/requirements?assessmentId=xxx — Get requirement statuses
 * PATCH /api/nis2/requirements — Update a requirement status
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";

const VALID_STATUSES = [
  "not_assessed",
  "compliant",
  "partial",
  "non_compliant",
  "not_applicable",
] as const;

// GET /api/nis2/requirements?assessmentId=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const assessmentId = request.nextUrl.searchParams.get("assessmentId");

    if (!assessmentId) {
      return NextResponse.json(
        { error: "assessmentId query parameter is required" },
        { status: 400 },
      );
    }

    // Verify ownership of the assessment
    const assessment = await prisma.nIS2Assessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    const requirements = await prisma.nIS2RequirementStatus.findMany({
      where: { assessmentId },
      orderBy: { requirementId: "asc" },
    });

    return NextResponse.json({ requirements });
  } catch (error) {
    console.error("Error fetching NIS2 requirements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/nis2/requirements - Update requirement status
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const {
      assessmentId,
      requirementId,
      status,
      notes,
      evidenceNotes,
      targetDate,
    } = body;

    if (!assessmentId || !requirementId) {
      return NextResponse.json(
        { error: "assessmentId and requirementId are required" },
        { status: 400 },
      );
    }

    // Validate status if provided
    if (
      status !== undefined &&
      !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])
    ) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Verify ownership of the assessment
    const assessment = await prisma.nIS2Assessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Find the requirement status
    const existing = await prisma.nIS2RequirementStatus.findUnique({
      where: {
        assessmentId_requirementId: {
          assessmentId,
          requirementId,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Requirement status not found" },
        { status: 404 },
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (evidenceNotes !== undefined) updateData.evidenceNotes = evidenceNotes;
    if (targetDate !== undefined)
      updateData.targetDate = targetDate ? new Date(targetDate) : null;

    const updated = await prisma.nIS2RequirementStatus.update({
      where: { id: existing.id },
      data: updateData,
    });

    // Recalculate maturity score for the assessment
    if (status !== undefined) {
      const allStatuses = await prisma.nIS2RequirementStatus.findMany({
        where: { assessmentId },
      });

      const total = allStatuses.length;
      const compliant = allStatuses.filter(
        (s) => s.status === "compliant",
      ).length;
      const partial = allStatuses.filter((s) => s.status === "partial").length;

      const maturityScore =
        total > 0 ? Math.round(((compliant + partial * 0.5) / total) * 100) : 0;

      await prisma.nIS2Assessment.update({
        where: { id: assessmentId },
        data: { maturityScore },
      });
    }

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "nis2_requirement_status_changed",
      entityType: "nis2_requirement",
      entityId: existing.id,
      previousValue: { status: existing.status, notes: existing.notes },
      newValue: { status, notes, evidenceNotes },
      description: `Updated NIS2 requirement ${requirementId} status to ${status || "unchanged"}`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ requirement: updated });
  } catch (error) {
    console.error("Error updating NIS2 requirement:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
