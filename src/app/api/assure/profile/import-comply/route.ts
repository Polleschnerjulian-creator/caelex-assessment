/**
 * Assure Import Comply Data API
 * POST: Link Comply data. Check if org has RRS data, pull rrsScore and
 *       component breakdown into the regulatory profile. Set complyLinked=true.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";

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

    // Check if organization has RRS data from Comply module
    const rrsScore = await prisma.regulatoryReadinessScore.findUnique({
      where: { organizationId },
    });

    if (!rrsScore) {
      return NextResponse.json(
        { error: "No RRS data found. Complete a Comply assessment first." },
        { status: 404 },
      );
    }

    // Ensure company profile exists
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

    // Build RRS component breakdown
    const rrsComponents = {
      authorizationReadiness: rrsScore.authorizationReadiness,
      cybersecurityPosture: rrsScore.cybersecurityPosture,
      operationalCompliance: rrsScore.operationalCompliance,
      jurisdictionalCoverage: rrsScore.jurisdictionalCoverage,
      regulatoryTrajectory: rrsScore.regulatoryTrajectory,
      governanceProcess: rrsScore.governanceProcess,
    };

    // Upsert regulatory profile with comply data
    const regulatoryProfile = await prisma.assureRegulatoryProfile.upsert({
      where: { profileId: profile.id },
      create: {
        profileId: profile.id,
        complyLinked: true,
        complyOrgId: organizationId,
        rrsScore: rrsScore.overallScore,
        rrsComponents: JSON.parse(JSON.stringify(rrsComponents)),
      },
      update: {
        complyLinked: true,
        complyOrgId: organizationId,
        rrsScore: rrsScore.overallScore,
        rrsComponents: JSON.parse(JSON.stringify(rrsComponents)),
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "assure_comply_linked",
      entityType: "assure_company_profile",
      entityId: profile.id,
      metadata: {
        rrsScore: rrsScore.overallScore,
        grade: rrsScore.grade,
      },
      organizationId,
    });

    return NextResponse.json({
      linked: true,
      rrsScore: rrsScore.overallScore,
      grade: rrsScore.grade,
      components: rrsComponents,
      regulatoryProfileId: regulatoryProfile.id,
    });
  } catch (error) {
    console.error("Assure import comply error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
