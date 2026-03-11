import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import {
  getPersonnelForAsset,
  addPersonnel,
} from "@/lib/nexus/personnel-service.server";
import { CreatePersonnelSchema } from "@/lib/nexus/validations";

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
    const personnel = await getPersonnelForAsset(id, organizationId);
    return NextResponse.json({ personnel });
  } catch (error) {
    logger.error("Error fetching personnel", error);
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
    const parsed = CreatePersonnelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const person = await addPersonnel(
      id,
      {
        ...parsed.data,
        lastTraining: parsed.data.lastTraining
          ? new Date(parsed.data.lastTraining)
          : undefined,
        accessExpiresAt: parsed.data.accessExpiresAt
          ? new Date(parsed.data.accessExpiresAt)
          : undefined,
      },
      organizationId,
      userId,
    );
    return NextResponse.json({ person }, { status: 201 });
  } catch (error) {
    logger.error("Error adding personnel", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
