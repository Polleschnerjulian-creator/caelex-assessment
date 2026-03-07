import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/verity/utils/redaction";
import { runOptimization } from "@/lib/optimizer/regulatory-optimizer.server";
import type { Prisma } from "@prisma/client";
import type {
  OptimizationInput,
  WeightProfileName,
} from "@/lib/optimizer/types";
import type {
  SpaceLawActivityType,
  EntityNationality,
  SpaceLawCountryCode,
} from "@/lib/space-law-types";

// ── Valid enum values ────────────────────────────────────────────

const VALID_ACTIVITY_TYPES: SpaceLawActivityType[] = [
  "spacecraft_operation",
  "launch_vehicle",
  "launch_site",
  "in_orbit_services",
  "earth_observation",
  "satellite_communications",
  "space_resources",
];

const VALID_ENTITY_NATIONALITIES: EntityNationality[] = [
  "domestic",
  "eu_other",
  "non_eu",
  "esa_member",
];

const VALID_ENTITY_SIZES = ["small", "medium", "large"] as const;
const VALID_PRIMARY_ORBITS = ["LEO", "MEO", "GEO", "beyond"] as const;
const VALID_WEIGHT_PROFILES: WeightProfileName[] = [
  "startup",
  "enterprise",
  "government",
  "balanced",
  "custom",
];

// ── POST /api/v1/optimizer/analyze ───────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    // 2. Parse body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // 3. Validate required fields
    const errors: string[] = [];

    if (
      !body.activityType ||
      !VALID_ACTIVITY_TYPES.includes(body.activityType as SpaceLawActivityType)
    ) {
      errors.push(
        `activityType must be one of: ${VALID_ACTIVITY_TYPES.join(", ")}`,
      );
    }

    if (
      !body.entityNationality ||
      !VALID_ENTITY_NATIONALITIES.includes(
        body.entityNationality as EntityNationality,
      )
    ) {
      errors.push(
        `entityNationality must be one of: ${VALID_ENTITY_NATIONALITIES.join(", ")}`,
      );
    }

    if (
      !body.entitySize ||
      !VALID_ENTITY_SIZES.includes(
        body.entitySize as (typeof VALID_ENTITY_SIZES)[number],
      )
    ) {
      errors.push(
        `entitySize must be one of: ${VALID_ENTITY_SIZES.join(", ")}`,
      );
    }

    if (
      !body.primaryOrbit ||
      !VALID_PRIMARY_ORBITS.includes(
        body.primaryOrbit as (typeof VALID_PRIMARY_ORBITS)[number],
      )
    ) {
      errors.push(
        `primaryOrbit must be one of: ${VALID_PRIMARY_ORBITS.join(", ")}`,
      );
    }

    if (
      typeof body.constellationSize !== "number" ||
      body.constellationSize <= 0
    ) {
      errors.push("constellationSize must be a positive number");
    }

    if (
      typeof body.missionDurationYears !== "number" ||
      body.missionDurationYears <= 0
    ) {
      errors.push("missionDurationYears must be a positive number");
    }

    if (typeof body.hasDesignForDemise !== "boolean") {
      errors.push("hasDesignForDemise must be a boolean");
    }

    if (
      !body.weightProfile ||
      !VALID_WEIGHT_PROFILES.includes(body.weightProfile as WeightProfileName)
    ) {
      errors.push(
        `weightProfile must be one of: ${VALID_WEIGHT_PROFILES.join(", ")}`,
      );
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 },
      );
    }

    // 4. Build typed input
    const input: OptimizationInput = {
      activityType: body.activityType as SpaceLawActivityType,
      entityNationality: body.entityNationality as EntityNationality,
      entitySize: body.entitySize as "small" | "medium" | "large",
      primaryOrbit: body.primaryOrbit as "LEO" | "MEO" | "GEO" | "beyond",
      constellationSize: body.constellationSize as number,
      missionDurationYears: body.missionDurationYears as number,
      hasDesignForDemise: body.hasDesignForDemise as boolean,
      weightProfile: body.weightProfile as WeightProfileName,
      customWeights: body.customWeights as OptimizationInput["customWeights"],
      currentJurisdiction: body.currentJurisdiction as
        | SpaceLawCountryCode
        | undefined,
      currentNoradId: body.currentNoradId as string | undefined,
    };

    // 5. Run optimization engine
    const result = await runOptimization(input);

    // 6. Persist to database
    const topRanking = result.rankings[0];
    await prisma.optimizationResult.create({
      data: {
        organizationId: membership.organizationId,
        inputJson: input as unknown as Prisma.InputJsonValue,
        weightProfile: input.weightProfile,
        spacecraftId: null,
        currentJurisdiction: input.currentJurisdiction ?? null,
        resultJson: result as unknown as Prisma.InputJsonValue,
        topJurisdiction: topRanking?.jurisdiction ?? "N/A",
        topScore: topRanking?.totalScore ?? 0,
      },
    });

    // 7. Return result
    return NextResponse.json({ data: result });
  } catch (error) {
    safeLog("Optimizer analyze error", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return NextResponse.json(
      { error: "Failed to run optimization analysis" },
      { status: 500 },
    );
  }
}
