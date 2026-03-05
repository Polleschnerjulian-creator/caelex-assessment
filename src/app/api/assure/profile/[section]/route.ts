/**
 * Assure Profile Section Update API
 * PUT: Update a profile section (overview, technology, market, team, financial,
 *      regulatory, competitive, traction). Validates with corresponding schema.
 *      Creates sub-profile if it doesn't exist (upsert). Recomputes completionScore.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";
import { computeProfileCompleteness } from "@/lib/assure/profile-engine.server";
import {
  companyProfileSchema,
  techProfileSchema,
  marketProfileSchema,
  teamProfileSchema,
  financialProfileSchema,
  regulatoryProfileSchema,
  competitiveProfileSchema,
  tractionProfileSchema,
} from "@/lib/assure/validations";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];

interface RouteParams {
  params: Promise<{ section: string }>;
}

const SECTION_CONFIG: Record<
  string,
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema: any;
    model: string;
    relation: string;
  }
> = {
  overview: {
    schema: companyProfileSchema,
    model: "assureCompanyProfile",
    relation: "",
  },
  technology: {
    schema: techProfileSchema,
    model: "assureTechProfile",
    relation: "techProfile",
  },
  market: {
    schema: marketProfileSchema,
    model: "assureMarketProfile",
    relation: "marketProfile",
  },
  team: {
    schema: teamProfileSchema,
    model: "assureTeamProfile",
    relation: "teamProfile",
  },
  financial: {
    schema: financialProfileSchema,
    model: "assureFinancialProfile",
    relation: "financialProfile",
  },
  regulatory: {
    schema: regulatoryProfileSchema,
    model: "assureRegulatoryProfile",
    relation: "regulatoryProfile",
  },
  competitive: {
    schema: competitiveProfileSchema,
    model: "assureCompetitiveProfile",
    relation: "competitiveProfile",
  },
  traction: {
    schema: tractionProfileSchema,
    model: "assureTractionProfile",
    relation: "tractionProfile",
  },
};

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

    const { section } = await params;

    const config = SECTION_CONFIG[section];
    if (!config) {
      return NextResponse.json(
        {
          error: `Invalid section: ${section}. Valid: ${Object.keys(SECTION_CONFIG).join(", ")}`,
        },
        { status: 400 },
      );
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
    const parsed = config.schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Ensure the company profile exists
    let profile = await prisma.assureCompanyProfile.findUnique({
      where: { organizationId },
    });

    if (!profile) {
      profile = await prisma.assureCompanyProfile.create({
        data: {
          organizationId,
          companyName: membership.organization.name,
        },
      });
    }

    let updatedRecord;

    if (section === "overview") {
      // Update the company profile itself
      updatedRecord = await prisma.assureCompanyProfile.update({
        where: { organizationId },
        data,
      });
    } else {
      // Upsert sub-profile
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prismaModel = prisma[config.model as keyof typeof prisma] as any;
      updatedRecord = await prismaModel.upsert({
        where: { profileId: profile.id },
        create: { profileId: profile.id, ...data },
        update: data,
      });
    }

    // Recompute completionScore
    const completeness = await computeProfileCompleteness(organizationId);
    await prisma.assureCompanyProfile.update({
      where: { organizationId },
      data: { completionScore: completeness.overallScore },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "assure_profile_updated",
      entityType: "assure_company_profile",
      entityId: profile.id,
      metadata: { section, fields: Object.keys(data) },
      organizationId,
    });

    return NextResponse.json({
      section,
      data: updatedRecord,
      completionScore: completeness.overallScore,
    });
  } catch (error) {
    logger.error("Assure profile section update error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
