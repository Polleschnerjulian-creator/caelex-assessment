/**
 * Assure Material Generation API
 * POST: Generate a new material. Create AssureMaterial with profile snapshot.
 *       Validate with materialGenerateSchema.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";
import { materialGenerateSchema } from "@/lib/assure/validations";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];

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
      include: { organization: true },
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

    const organizationId = membership.organizationId;

    const body = await request.json();
    const parsed = materialGenerateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Fetch current profile snapshot
    const profile = await prisma.assureCompanyProfile.findUnique({
      where: { organizationId },
      include: {
        techProfile: true,
        marketProfile: true,
        teamProfile: true,
        financialProfile: true,
        regulatoryProfile: true,
        competitiveProfile: true,
        tractionProfile: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Company profile not found. Create a profile first." },
        { status: 404 },
      );
    }

    // Count existing materials of this type for versioning
    const existingCount = await prisma.assureMaterial.count({
      where: { organizationId, type: data.type },
    });

    const material = await prisma.assureMaterial.create({
      data: {
        organizationId,
        createdById: session.user.id,
        type: data.type,
        title:
          data.title ||
          `${data.type.replace(/_/g, " ")} — ${membership.organization.name}`,
        version: existingCount + 1,
        includedSections: data.includedSections ?? [],
        customizations: data.customizations ?? Prisma.JsonNull,
        profileSnapshot: structuredClone(profile),
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "assure_material_generated",
      entityType: "assure_material",
      entityId: material.id,
      metadata: {
        type: data.type,
        title: material.title,
        version: material.version,
      },
      organizationId,
    });

    const creator = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({
      id: material.id,
      type: material.type,
      title: material.title,
      version: material.version,
      includedSections: material.includedSections,
      profileSnapshot: material.profileSnapshot,
      createdBy: creator,
      createdAt: material.createdAt,
    });
  } catch (error) {
    logger.error("Assure material generation error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
