import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { autoDetectDependencies } from "@/lib/nexus/dependency-service.server";

export async function POST(_req: Request) {
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
    const suggestions = await autoDetectDependencies(organizationId);
    return NextResponse.json({ suggestions });
  } catch (error) {
    logger.error("Error auto-detecting dependencies", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
