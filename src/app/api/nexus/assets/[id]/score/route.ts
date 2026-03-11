import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import {
  calculateAssetComplianceScore,
  calculateAssetRiskScore,
} from "@/lib/nexus/asset-service.server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgContext = await getCurrentOrganization(session.user.id);
    if (!orgContext?.organizationId) {
      return NextResponse.json(
        { error: "Organization required" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const [complianceScore, riskScore] = await Promise.all([
      calculateAssetComplianceScore(id),
      calculateAssetRiskScore(id),
    ]);

    return NextResponse.json({ complianceScore, riskScore });
  } catch (error) {
    logger.error("Error recalculating asset scores", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
