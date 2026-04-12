/**
 * Dashboard Profile API
 *
 * GET  /api/dashboard/profile — Read operator profile from assessment data
 * PUT  /api/dashboard/profile — Update operator profile
 */

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logger } from "@/lib/logger";
import type { CompanyProfileData } from "@/lib/dashboard/profile-types";

// ── Zod schema for PUT body ──────────────────────────────────────────────────

const profileSchema = z.object({
  companyName: z.string().nullable(),
  establishmentCountry: z.string().nullable(),
  entitySize: z.enum(["micro", "small", "medium", "large"]).nullable(),
  isResearchInstitution: z.boolean(),
  isStartup: z.boolean(),
  activityTypes: z.array(z.string()),
  serviceTypes: z.array(z.string()),
  primaryOrbitalRegime: z.string().nullable(),
  operatesConstellation: z.boolean(),
  constellationSize: z.string().nullable(),
  spacecraftCount: z.number().nullable(),
  missionDuration: z.string().nullable(),
  isDefenseOnly: z.boolean(),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractProfileFromAssessment(raw: string): CompanyProfileData {
  const emptyProfile: CompanyProfileData = {
    companyName: null,
    establishmentCountry: null,
    entitySize: null,
    isResearchInstitution: false,
    isStartup: false,
    activityTypes: [],
    serviceTypes: [],
    primaryOrbitalRegime: null,
    operatesConstellation: false,
    constellationSize: null,
    spacecraftCount: null,
    missionDuration: null,
    isDefenseOnly: false,
  };

  try {
    const parsed = JSON.parse(raw);

    // Format 1: RedactedUnifiedResult (stored by /api/unified/save-to-dashboard)
    // Has companySummary.name, companySummary.establishment, etc.
    if (parsed.companySummary && typeof parsed.companySummary === "object") {
      const cs = parsed.companySummary;

      // Map activity labels back to codes (e.g. "Spacecraft Operator" -> "SCO")
      const activityLabelToCode: Record<string, string> = {
        "Spacecraft Operator": "SCO",
        "Launch Operator": "LO",
        "Launch Site Operator": "LSO",
        "In-Space Service Operator": "ISOS",
        "Collision Avoidance Provider": "CAP",
        "Positional Data Provider": "PDP",
        "Third Country Operator": "TCO",
      };
      const activityTypes = Array.isArray(cs.activities)
        ? cs.activities.map((a: string) => activityLabelToCode[a] || a)
        : [];

      // Map size labels back to codes
      const sizeLabelToCode: Record<string, string> = {
        "Micro Enterprise": "micro",
        "Small Enterprise": "small",
        "Medium Enterprise": "medium",
        "Large Enterprise": "large",
      };
      const entitySize = cs.size
        ? sizeLabelToCode[cs.size] || cs.size.toLowerCase()
        : null;

      return {
        companyName: cs.name ?? null,
        establishmentCountry: cs.establishment ?? null,
        entitySize: entitySize as CompanyProfileData["entitySize"],
        isResearchInstitution: false,
        isStartup: false,
        activityTypes,
        serviceTypes: [],
        primaryOrbitalRegime: null,
        operatesConstellation: false,
        constellationSize: null,
        spacecraftCount: null,
        missionDuration: null,
        isDefenseOnly: false,
      };
    }

    // Format 2: Raw assessment answers (stored by legacy flow or profile PUT)
    // Has flat .companyName, .establishmentCountry, etc.
    const answers = parsed.answers ?? parsed;

    return {
      companyName: answers.companyName ?? null,
      establishmentCountry: answers.establishmentCountry ?? null,
      entitySize: answers.entitySize ?? null,
      isResearchInstitution: answers.isResearchInstitution ?? false,
      isStartup: answers.isStartup ?? false,
      activityTypes: answers.activityTypes ?? [],
      serviceTypes: answers.serviceTypes ?? [],
      primaryOrbitalRegime: answers.primaryOrbitalRegime ?? null,
      operatesConstellation: answers.operatesConstellation ?? false,
      constellationSize: answers.constellationSize ?? null,
      spacecraftCount: answers.spacecraftCount ?? null,
      missionDuration: answers.missionDuration ?? null,
      isDefenseOnly: answers.isDefenseOnly ?? false,
    };
  } catch {
    return emptyProfile;
  }
}

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's assessment result
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { unifiedAssessmentResult: true },
    });

    // Also try to get OperatorProfile via the user's organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    let operatorProfile = null;
    if (orgMember) {
      operatorProfile = await prisma.operatorProfile.findUnique({
        where: { organizationId: orgMember.organizationId },
      });
    }

    // Extract from assessment data
    let profileData: CompanyProfileData;
    if (user?.unifiedAssessmentResult) {
      profileData = extractProfileFromAssessment(user.unifiedAssessmentResult);
    } else {
      profileData = {
        companyName: null,
        establishmentCountry: null,
        entitySize: null,
        isResearchInstitution: false,
        isStartup: false,
        activityTypes: [],
        serviceTypes: [],
        primaryOrbitalRegime: null,
        operatesConstellation: false,
        constellationSize: null,
        spacecraftCount: null,
        missionDuration: null,
        isDefenseOnly: false,
      };
    }

    // Merge OperatorProfile data (takes precedence for overlapping fields)
    if (operatorProfile) {
      if (operatorProfile.establishment)
        profileData.establishmentCountry = operatorProfile.establishment;
      if (operatorProfile.entitySize)
        profileData.entitySize =
          operatorProfile.entitySize as CompanyProfileData["entitySize"];
      if (operatorProfile.primaryOrbit)
        profileData.primaryOrbitalRegime = operatorProfile.primaryOrbit;
      if (operatorProfile.isConstellation !== undefined)
        profileData.operatesConstellation = operatorProfile.isConstellation;
      if (operatorProfile.constellationSize != null)
        profileData.constellationSize = String(
          operatorProfile.constellationSize,
        );
      profileData.isResearchInstitution = operatorProfile.isResearch;
      profileData.isDefenseOnly = operatorProfile.isDefenseOnly;
    }

    return NextResponse.json({ success: true, profile: profileData });
  } catch (error) {
    logger.error("Failed to get operator profile", error);
    return NextResponse.json(
      { error: "Failed to get operator profile" },
      { status: 500 },
    );
  }
}

// ── PUT ──────────────────────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // Resolve organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!orgMember) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 },
      );
    }

    const organizationId = orgMember.organizationId;

    // Upsert OperatorProfile
    await prisma.operatorProfile.upsert({
      where: { organizationId },
      update: {
        establishment: data.establishmentCountry,
        entitySize: data.entitySize,
        primaryOrbit: data.primaryOrbitalRegime,
        isConstellation: data.operatesConstellation,
        constellationSize: data.constellationSize
          ? parseInt(data.constellationSize, 10) || null
          : null,
        isResearch: data.isResearchInstitution,
        isDefenseOnly: data.isDefenseOnly,
        euOperatorCode: data.activityTypes[0] ?? null,
      },
      create: {
        organizationId,
        establishment: data.establishmentCountry,
        entitySize: data.entitySize,
        primaryOrbit: data.primaryOrbitalRegime,
        isConstellation: data.operatesConstellation,
        constellationSize: data.constellationSize
          ? parseInt(data.constellationSize, 10) || null
          : null,
        isResearch: data.isResearchInstitution,
        isDefenseOnly: data.isDefenseOnly,
        euOperatorCode: data.activityTypes[0] ?? null,
      },
    });

    // Also update the assessment result JSON so CompanyProfileBar stays in sync
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { unifiedAssessmentResult: true },
    });

    if (user?.unifiedAssessmentResult) {
      try {
        const existing = JSON.parse(user.unifiedAssessmentResult);
        const answers = existing.answers ?? existing;

        // Update fields
        answers.companyName = data.companyName;
        answers.establishmentCountry = data.establishmentCountry;
        answers.entitySize = data.entitySize;
        answers.isResearchInstitution = data.isResearchInstitution;
        answers.isStartup = data.isStartup;
        answers.activityTypes = data.activityTypes;
        answers.serviceTypes = data.serviceTypes;
        answers.primaryOrbitalRegime = data.primaryOrbitalRegime;
        answers.operatesConstellation = data.operatesConstellation;
        answers.constellationSize = data.constellationSize;
        answers.spacecraftCount = data.spacecraftCount;
        answers.missionDuration = data.missionDuration;
        answers.isDefenseOnly = data.isDefenseOnly;

        // Write back
        if (existing.answers) {
          existing.answers = answers;
        }

        await prisma.user.update({
          where: { id: session.user.id },
          data: {
            unifiedAssessmentResult: JSON.stringify(
              existing.answers ? existing : answers,
            ),
          },
        });
      } catch {
        // If JSON parsing fails, don't block the save — OperatorProfile was updated
        logger.warn(
          "Could not update assessment result JSON during profile save",
        );
      }
    }

    return NextResponse.json({ success: true, profile: data });
  } catch (error) {
    logger.error("Failed to update operator profile", error);
    return NextResponse.json(
      { error: "Failed to update operator profile" },
      { status: 500 },
    );
  }
}
