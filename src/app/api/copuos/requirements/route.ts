import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  allCopuosIadcGuidelines,
  getApplicableGuidelines,
  getGuidelinesBySource,
  getGuidelinesByCategory,
  getMandatoryGuidelines,
  getCriticalGuidelines,
  getSatelliteCategory,
  type CopuosMissionProfile,
  type OrbitRegime,
  type MissionType,
  type GuidelineSource,
  type GuidelineCategory,
} from "@/data/copuos-iadc-requirements";

// GET /api/copuos/requirements - Get all COPUOS/IADC/ISO requirements
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Filter parameters
    const source = searchParams.get("source") as GuidelineSource | null;
    const category = searchParams.get("category") as GuidelineCategory | null;
    const mandatoryOnly = searchParams.get("mandatoryOnly") === "true";
    const criticalOnly = searchParams.get("criticalOnly") === "true";

    // Profile-based filtering
    const orbitRegime = searchParams.get("orbitRegime") as OrbitRegime | null;
    const missionType = searchParams.get("missionType") as MissionType | null;
    const satelliteMassKg = searchParams.get("satelliteMassKg");
    const hasPropulsion = searchParams.get("hasPropulsion") === "true";
    const isConstellation = searchParams.get("isConstellation") === "true";

    let guidelines = allCopuosIadcGuidelines;

    // Apply filters
    if (source) {
      guidelines = getGuidelinesBySource(source);
    }

    if (category) {
      guidelines = guidelines.filter((g) => g.category === category);
    }

    if (mandatoryOnly) {
      guidelines = guidelines.filter((g) => g.bindingLevel === "mandatory");
    }

    if (criticalOnly) {
      guidelines = guidelines.filter((g) => g.severity === "critical");
    }

    // If profile parameters provided, filter by applicability
    if (orbitRegime && missionType && satelliteMassKg) {
      const profile: CopuosMissionProfile = {
        orbitRegime,
        missionType,
        satelliteCategory: getSatelliteCategory(parseFloat(satelliteMassKg)),
        satelliteMassKg: parseFloat(satelliteMassKg),
        hasManeuverability: hasPropulsion,
        hasPropulsion,
        plannedLifetimeYears: 5,
        isConstellation,
      };
      guidelines = getApplicableGuidelines(profile);
    }

    // Group by source for convenience
    const bySource = {
      COPUOS: guidelines.filter((g) => g.source === "COPUOS"),
      IADC: guidelines.filter((g) => g.source === "IADC"),
      ISO: guidelines.filter((g) => g.source === "ISO"),
    };

    // Group by category
    const byCategory: Record<string, typeof guidelines> = {};
    for (const guideline of guidelines) {
      if (!byCategory[guideline.category]) {
        byCategory[guideline.category] = [];
      }
      byCategory[guideline.category].push(guideline);
    }

    // Summary statistics
    const summary = {
      total: guidelines.length,
      mandatory: guidelines.filter((g) => g.bindingLevel === "mandatory")
        .length,
      recommended: guidelines.filter((g) => g.bindingLevel === "recommended")
        .length,
      bestPractice: guidelines.filter((g) => g.bindingLevel === "best_practice")
        .length,
      critical: guidelines.filter((g) => g.severity === "critical").length,
      major: guidelines.filter((g) => g.severity === "major").length,
      minor: guidelines.filter((g) => g.severity === "minor").length,
      copuosCount: bySource.COPUOS.length,
      iadcCount: bySource.IADC.length,
      isoCount: bySource.ISO.length,
    };

    return NextResponse.json({
      guidelines,
      bySource,
      byCategory,
      summary,
    });
  } catch (error) {
    console.error("Error fetching COPUOS requirements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
