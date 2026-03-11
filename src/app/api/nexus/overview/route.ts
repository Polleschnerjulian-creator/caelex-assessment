import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { getOrganizationRiskOverview } from "@/lib/nexus/asset-service.server";

export async function GET(_req: Request) {
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

    const organizationId = orgContext.organizationId;
    const overview = await getOrganizationRiskOverview(organizationId);
    return NextResponse.json(overview);
  } catch (error) {
    logger.error("Error fetching NEXUS overview", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
