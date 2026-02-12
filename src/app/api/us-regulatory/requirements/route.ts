import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  allUsSpaceRequirements,
  getAgencyRequirements,
  getRequirementsByCategory,
  getRequirementsByLicenseType,
  getMandatoryRequirements,
  getCriticalRequirements,
  getRequirementsWithEuCrossRef,
  getRequirementsWithCopuosCrossRef,
  type UsAgency,
  type UsRequirementCategory,
  type UsLicenseType,
} from "@/data/us-space-regulations";

// GET /api/us-regulatory/requirements - Get US Space requirements with filters
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agency = searchParams.get("agency") as UsAgency | null;
    const category = searchParams.get(
      "category",
    ) as UsRequirementCategory | null;
    const licenseType = searchParams.get("licenseType") as UsLicenseType | null;
    const mandatoryOnly = searchParams.get("mandatory") === "true";
    const criticalOnly = searchParams.get("critical") === "true";
    const withEuCrossRef = searchParams.get("withEuCrossRef") === "true";
    const withCopuosCrossRef =
      searchParams.get("withCopuosCrossRef") === "true";

    let requirements = allUsSpaceRequirements;

    // Filter by agency
    if (agency) {
      const validAgencies: UsAgency[] = ["FCC", "FAA", "NOAA"];
      if (!validAgencies.includes(agency)) {
        return NextResponse.json(
          { error: `Invalid agency: ${agency}. Must be FCC, FAA, or NOAA` },
          { status: 400 },
        );
      }
      requirements = getAgencyRequirements(agency);
    }

    // Filter by category
    if (category) {
      const validCategories: UsRequirementCategory[] = [
        "licensing",
        "spectrum",
        "orbital_debris",
        "launch_safety",
        "reentry_safety",
        "remote_sensing",
        "financial_responsibility",
        "environmental",
        "national_security",
        "coordination",
        "reporting",
      ];
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { error: `Invalid category: ${category}` },
          { status: 400 },
        );
      }
      requirements = requirements.filter((r) => r.category === category);
    }

    // Filter by license type
    if (licenseType) {
      const validLicenseTypes: UsLicenseType[] = [
        "fcc_space_station",
        "fcc_earth_station",
        "fcc_spectrum",
        "fcc_experimental",
        "faa_launch",
        "faa_reentry",
        "faa_spaceport",
        "faa_safety_approval",
        "noaa_remote_sensing",
      ];
      if (!validLicenseTypes.includes(licenseType)) {
        return NextResponse.json(
          { error: `Invalid license type: ${licenseType}` },
          { status: 400 },
        );
      }
      requirements = requirements.filter((r) =>
        r.licenseTypes.includes(licenseType),
      );
    }

    // Filter mandatory only
    if (mandatoryOnly) {
      requirements = requirements.filter((r) => r.bindingLevel === "mandatory");
    }

    // Filter critical only
    if (criticalOnly) {
      requirements = requirements.filter((r) => r.severity === "critical");
    }

    // Filter with EU cross-reference
    if (withEuCrossRef) {
      requirements = requirements.filter(
        (r) => r.euSpaceActCrossRef && r.euSpaceActCrossRef.length > 0,
      );
    }

    // Filter with COPUOS cross-reference
    if (withCopuosCrossRef) {
      requirements = requirements.filter(
        (r) => r.copuosCrossRef && r.copuosCrossRef.length > 0,
      );
    }

    // Calculate summary stats
    const stats = {
      total: allUsSpaceRequirements.length,
      filtered: requirements.length,
      byAgency: {
        FCC: requirements.filter((r) => r.agency === "FCC").length,
        FAA: requirements.filter((r) => r.agency === "FAA").length,
        NOAA: requirements.filter((r) => r.agency === "NOAA").length,
      },
      mandatory: requirements.filter((r) => r.bindingLevel === "mandatory")
        .length,
      critical: requirements.filter((r) => r.severity === "critical").length,
      withEuCrossRef: requirements.filter(
        (r) => r.euSpaceActCrossRef && r.euSpaceActCrossRef.length > 0,
      ).length,
      withCopuosCrossRef: requirements.filter(
        (r) => r.copuosCrossRef && r.copuosCrossRef.length > 0,
      ).length,
    };

    return NextResponse.json({
      requirements,
      stats,
    });
  } catch (error) {
    console.error("Error fetching US requirements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
