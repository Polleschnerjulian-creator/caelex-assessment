import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import {
  getSuppliersForAsset,
  addSupplier,
} from "@/lib/nexus/supplier-service.server";
import { CreateSupplierSchema } from "@/lib/nexus/validations";

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
    const suppliers = await getSuppliersForAsset(id, organizationId);
    return NextResponse.json({ suppliers });
  } catch (error) {
    logger.error("Error fetching suppliers", error);
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
    const parsed = CreateSupplierSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supplier = await addSupplier(
      id,
      {
        ...parsed.data,
        contractExpiry: parsed.data.contractExpiry
          ? new Date(parsed.data.contractExpiry)
          : undefined,
      },
      organizationId,
      userId,
    );
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    logger.error("Error adding supplier", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
