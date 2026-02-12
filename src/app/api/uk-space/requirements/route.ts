import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  allUkSpaceRequirements,
  getRequirementsByCategory,
  getRequirementsByLicenseType,
  getMandatoryRequirements,
  getCriticalRequirements,
  getRequirementsWithEuCrossRef,
  ukEuComparisons,
  operatorTypeConfig,
  activityTypeConfig,
  licenseTypeConfig,
  categoryConfig,
  complianceStatusConfig,
  type UkRequirementCategory,
  type UkLicenseType,
} from "@/data/uk-space-industry-act";

// GET /api/uk-space/requirements - Get UK Space requirements with optional filters
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get(
      "category",
    ) as UkRequirementCategory | null;
    const licenseType = searchParams.get("licenseType") as UkLicenseType | null;
    const mandatory = searchParams.get("mandatory");
    const critical = searchParams.get("critical");
    const withEuCrossRef = searchParams.get("withEuCrossRef");
    const includeComparisons = searchParams.get("includeComparisons");

    let requirements = allUkSpaceRequirements;

    // Apply filters
    if (category) {
      requirements = getRequirementsByCategory(category);
    } else if (licenseType) {
      requirements = getRequirementsByLicenseType(licenseType);
    } else if (mandatory === "true") {
      requirements = getMandatoryRequirements();
    } else if (critical === "true") {
      requirements = getCriticalRequirements();
    } else if (withEuCrossRef === "true") {
      requirements = getRequirementsWithEuCrossRef();
    }

    const response: Record<string, unknown> = {
      requirements,
      count: requirements.length,
      totalRequirements: allUkSpaceRequirements.length,
      config: {
        operatorTypes: operatorTypeConfig,
        activityTypes: activityTypeConfig,
        licenseTypes: licenseTypeConfig,
        categories: categoryConfig,
        complianceStatuses: complianceStatusConfig,
      },
    };

    // Include UK-EU comparisons if requested
    if (includeComparisons === "true") {
      response.ukEuComparisons = ukEuComparisons;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching UK Space requirements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
