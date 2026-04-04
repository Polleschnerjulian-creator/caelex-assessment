import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { getMfaAdoptionRate } from "@/lib/nexus/personnel-service.server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

export async function GET(req: Request) {
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

    const rl = await checkRateLimit("api", getIdentifier(req, session.user.id));
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const organizationId = orgContext.organizationId;
    const data = await getMfaAdoptionRate(organizationId);
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Error fetching MFA adoption rate", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
