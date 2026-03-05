/**
 * Assure Risks API
 * GET: List all risks for org. Support ?category filter.
 * POST: Create a new risk. Compute riskScore = probability_value * impact_value.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";
import { riskSchema } from "@/lib/assure/validations";
import { logger } from "@/lib/logger";

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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const where: Record<string, unknown> = {
      organizationId: membership.organizationId,
    };
    if (category) {
      where.category = category;
    }

    const risks = await prisma.assureRisk.findMany({
      where,
      orderBy: [{ riskScore: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ risks });
  } catch (error) {
    logger.error("Assure risks list error", error);
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

    const organizationId = membership.organizationId;

    // Ensure company profile exists
    const profile = await prisma.assureCompanyProfile.findUnique({
      where: { organizationId },
    });
    if (!profile) {
      return NextResponse.json(
        { error: "Company profile not found. Create a profile first." },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = riskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (
      !data.category ||
      !data.title ||
      !data.description ||
      !data.probability ||
      !data.impact
    ) {
      return NextResponse.json(
        {
          error:
            "category, title, description, probability, and impact are required",
        },
        { status: 400 },
      );
    }

    // Compute risk score
    const probabilityValue = PROBABILITY_VALUES[data.probability] || 3;
    const impactValue = IMPACT_VALUES[data.impact] || 3;
    const riskScore = probabilityValue * impactValue;

    const risk = await prisma.assureRisk.create({
      data: {
        profileId: profile.id,
        organizationId,
        category: data.category,
        title: data.title,
        description: data.description,
        probability: data.probability,
        impact: data.impact,
        riskScore,
        financialExposure: data.financialExposure ?? null,
        mitigationStrategy: data.mitigationStrategy ?? null,
        mitigationStatus: data.mitigationStatus ?? "IDENTIFIED",
        timeHorizon: data.timeHorizon ?? null,
        triggerEvents: data.triggerEvents
          ? data.triggerEvents
          : Prisma.JsonNull,
        earlyWarnings: data.earlyWarnings
          ? data.earlyWarnings
          : Prisma.JsonNull,
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "assure_risk_created",
      entityType: "assure_risk",
      entityId: risk.id,
      metadata: {
        category: data.category,
        title: data.title,
        riskScore,
      },
      organizationId,
    });

    return NextResponse.json(risk, { status: 201 });
  } catch (error) {
    logger.error("Assure risk create error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
