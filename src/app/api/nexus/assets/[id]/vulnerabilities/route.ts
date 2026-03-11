import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import {
  getVulnerabilitiesForAsset,
  addVulnerability,
} from "@/lib/nexus/vulnerability-service.server";
import { CreateVulnerabilitySchema } from "@/lib/nexus/validations";

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
    const organizationId = orgContext.organizationId;
    const vulnerabilities = await getVulnerabilitiesForAsset(
      id,
      organizationId,
    );
    return NextResponse.json({ vulnerabilities });
  } catch (error) {
    logger.error("Error fetching vulnerabilities", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}

export async function POST(
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
    const organizationId = orgContext.organizationId;
    const userId = session.user.id;
    const body = await req.json();
    const parsed = CreateVulnerabilitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const vulnerability = await addVulnerability(
      id,
      parsed.data,
      organizationId,
      userId,
    );
    return NextResponse.json({ vulnerability }, { status: 201 });
  } catch (error) {
    logger.error("Error adding vulnerability", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
